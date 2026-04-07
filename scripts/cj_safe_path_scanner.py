import asyncio
import logging
import sys
import os
import json
from decimal import Decimal

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_root = os.path.join(project_root, 'backend')
if backend_root not in sys.path:
    sys.path.append(backend_root)

from app.db.session import SessionLocal
from app.services.cj_service import CJDropshippingService
from app.models.product import CandidateProduct

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

async def run_safe_path_scan():
    db = SessionLocal()
    cj_service = CJDropshippingService()
    
    # v5.3: Using verified CJ Category IDs for targeted sweeping
    categories = {
        "Smart Pet Tech": "2409110611570657700", # Pet Supplies
        "Smart Home Gadgets": "6A5D2EB4-13BD-462E-A627-78CFED11B2A2", # Home Improvement
        "Summer Cooling": None # No specific CID found, will use keywords broad sweep
    }
    
    # Custom keywords for each category to ensure high-value matches
    cat_keywords = {
        "Smart Pet Tech": ["Feeder", "Fountain", "Smart Toy"],
        "Smart Home Gadgets": ["Purifier", "Humidifier", "Gadget"],
        "Summer Cooling": ["Handheld Fan", "Neck Fan", "Portable Cooler"]
    }
    
    all_vetted = []
    
    print("🚀 Starting CJ 'Safe-Path' Global Sweep (v5.3)...")
    print("-" * 50)
    
    for cat_name, cid in categories.items():
        print(f"\n📂 Scanning Category: {cat_name}")
        keywords = cat_keywords.get(cat_name, [None])
        
        for kw in keywords:
            print(f"🔍 Scanning {kw or 'Broad'} in {cat_name}...")
            try:
                candidates = await cj_service.search_products(kw, category_id=cid, only_cj_owned=True)
                if candidates:
                    print(f"✅ Found {len(candidates)} raw matches. Vetting...")
                    for p in candidates[:5]: 
                        vetted = await vet_product(cj_service, p, cat_name)
                        if vetted:
                            all_vetted.append(vetted)
                            await ingest_to_db(db, vetted, cat_name)
                else:
                    print(f"⏭️ No safe-path matches.")
            except Exception as e:
                logger.error(f"Error scanning {cat_name}/{kw}: {e}")
        
        await asyncio.sleep(2)

    print("\n" + "="*50)
    print(f"🏁 SCAN COMPLETE. Total Vetted Candidates: {len(all_vetted)}")
    print("="*50)
    
    if all_vetted:
        print("\nTOP 0Buck Vetted Candidates (Safe-Path):")
        for i, c in enumerate(all_vetted[:10], 1):
            print(f"{i}. {c['product_name']} | ROI: {c['roi']}x | Target: ${c['target_price']} | Amazon: ${c['amazon_anchor']}")
    
    db.close()

async def vet_product(cj_service, p, category):
    """Reuse the ROI/Freight vetting logic from cj_service."""
    name = p.get("nameEn") or p.get("productName")
    pid = p.get("id") or p.get("pid")
    cost_usd_raw = p.get("sellPrice") or p.get("productSellPrice") or "0"
    
    if " -- " in str(cost_usd_raw):
        cost_usd = float(str(cost_usd_raw).split(" -- ")[1])
    else:
        cost_usd = float(str(cost_usd_raw))

    freight = 8.0 
    try:
        if pid:
            estimates = await cj_service.get_freight_estimate(pid, "US")
            if estimates:
                freight = float(estimates[0].get("logisticFee", 8.0))
    except Exception as e:
        print(f"   ⚠️ Exception: {e}")
        pass

    landed_cost = cost_usd + freight
    
    from app.services.tools import _web_search_func
    import re
    market_data = {"amazon_price": None, "amazon_compare_at_price": None}
    try:
        amazon_results = await _web_search_func(f"{name} price on amazon.com")
        print(f"   DEBUG: Search results for {name[:20]}: {amazon_results}")
        for res in amazon_results:
            if isinstance(res, dict):
                content = res.get('text', '') or res.get('snippet', '') or res.get('highlights', '')
                if isinstance(content, list): content = " ".join(content)
                text = f"{res.get('title', '')} {content}"
                print(f"   DEBUG: Text snippet: {text[:150]}...")
                price_match = re.search(r"\$\s?([\d,]+(\.\d{1,2})?)", text)
                if price_match and not market_data["amazon_price"]:
                    market_data["amazon_price"] = float(price_match.group(1).replace(",", ""))
                list_match = re.search(r"(?:List Price|Was|MSRP):\s*\$\s?([\d,]+(\.\d{1,2})?)", text, re.I)
                if list_match and not market_data["amazon_compare_at_price"]:
                    market_data["amazon_compare_at_price"] = float(list_match.group(1).replace(",", ""))
                if market_data["amazon_price"]: break
    except Exception as e:
        print(f"   ⚠️ Exception: {e}")
        pass

    anchor = market_data["amazon_compare_at_price"] or market_data["amazon_price"]
    if not anchor:
        print(f"   ❌ No anchor for {name[:30]}...")
        return None
        
    target_price = anchor * 0.6
    roi = target_price / landed_cost if landed_cost > 0 else 0
    
    # v5.4: Collection Tagging Logic
    collection_tag = "value-only"
    category_type = "TRAFFIC"
    is_cashback = False
    
    if roi >= 4.0:
        collection_tag = "rebate-eligible"
        category_type = "PROFIT"
        is_cashback = True
    
    if roi >= 1.5:
        print(f"   ✨ VETTED: {name[:30]}... ROI: {round(roi, 2)}x ({collection_tag})")
        return {
            "product_name": name,
            "cj_pid": pid,
            "landed_cost": landed_cost,
            "amazon_anchor": anchor,
            "target_price": target_price,
            "roi": round(roi, 2),
            "image": p.get("bigImage") or p.get("productImage"),
            "collection_tag": collection_tag,
            "category_type": category_type,
            "is_cashback": is_cashback
        }
    else:
        print(f"   ❌ ROI {round(roi, 2)}x too low for {name[:30]}...")
    return None

async def ingest_to_db(db, c, category):
    """Ingest vetted candidate into the database."""
    exists = db.query(CandidateProduct).filter_by(product_id_1688=c['cj_pid']).first()
    if exists: return

    new_candidate = CandidateProduct(
        product_id_1688=c['cj_pid'],
        title_zh=c['product_name'],
        title_en_preview=c['product_name'],
        cost_cny=float(c['landed_cost'] * 7.1), 
        amazon_price=float(c['amazon_anchor']),
        amazon_compare_at_price=float(c['amazon_anchor']),
        estimated_sale_price=float(c['target_price']),
        profit_ratio=float(c['roi']), 
        images=[c['image']] if c['image'] else [],
        discovery_source="CJ_SAFE_PATH",
        status="new",
        audit_notes=f"v5.4 Safe-Path: ROI {c['roi']}x, Tag: {c['collection_tag']}, Cat: {category}",
        source_platform="CJ",
        source_url=f"https://app.cjdropshipping.com/product-detail.html?id={c['cj_pid']}",
        category=category,
        category_type=c['category_type'],
        is_cashback_eligible=c['is_cashback'],
        discovery_evidence={
            "cj_pid": c['cj_pid'],
            "roi": c['roi'],
            "landed_cost_usd": c['landed_cost'],
            "amazon_anchor": c['amazon_anchor'],
            "collection_tag": c['collection_tag']
        }
    )
    db.add(new_candidate)
    db.commit()

if __name__ == "__main__":
    asyncio.run(run_safe_path_scan())
