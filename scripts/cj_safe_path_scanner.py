import asyncio
import logging
import sys
import os
import json
import re
import random
from decimal import Decimal

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.services.cj_service import CJDropshippingService
from app.services.supply_chain import SupplyChainService
from app.models.product import CandidateProduct
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def safe_float(val, default=0.0):
    if not val: return default
    try:
        if isinstance(val, str) and "-" in val:
            parts = val.split("-")
            return float(parts[-1])
        return float(val)
    except: return default

async def find_market_evidence(name, landed_cost):
    """v5.9.4: Full Audit with Identity Match and Price Extraction."""
    from app.services.tools import _web_search_func
    
    evidence = {
        "selling_price": 0.0, "list_price": 0.0, "market_url": "", 
        "pack_size": 1, "unit_selling_price": 0.0, "unit_list_price": 0.0,
        "identity_confirmed": False
    }
    
    try:
        # Search for Amazon product with pricing context
        search_query = f"{name} amazon official product price"
        results = await _web_search_func(search_query)
        
        if results and isinstance(results, list):
            for res in results:
                url = res.get("url", "").lower()
                # Focus on standard Amazon product pages
                if "amazon.com" in url and ("/dp/" in url or "/gp/product/" in url):
                    amz_title = (res.get("title") or "").lower()
                    text_blob = (amz_title + " " + (res.get("text") or "")).lower()
                    
                    # 1. Identity Check: Shared significant keywords
                    cj_keys = set(re.findall(r'\w{4,}', name.lower()))
                    amz_keys = set(re.findall(r'\w{4,}', amz_title))
                    shared = cj_keys.intersection(amz_keys)
                    
                    # Must share at least 2 long keywords OR 30% of CJ title words
                    if len(shared) < 2 and (len(shared) / max(len(cj_keys), 1)) < 0.3:
                        continue
                    
                    # 2. Pack Size Detection
                    pack_match = re.search(r'(\d+)\s?-(?:pack|pcs|set|count|pairs)', text_blob)
                    if not pack_match: pack_match = re.search(r'(?:pack|set|count)\s?of\s?(\d+)', text_blob)
                    if pack_match: evidence["pack_size"] = int(pack_match.group(1))
                    
                    # 3. Price Extraction from Exa Snippet
                    price_matches = re.findall(r'\$\s?(\d+(?:\.\d{2})?)', text_blob)
                    if price_matches:
                        prices = sorted([float(p) for p in price_matches if float(p) > 1.5])
                        if prices:
                            evidence["selling_price"] = prices[0]
                            evidence["list_price"] = max(prices)
                            evidence["unit_selling_price"] = round(evidence["selling_price"] / evidence["pack_size"], 2)
                            evidence["unit_list_price"] = round(evidence["list_price"] / evidence["pack_size"], 2)
                            evidence["market_url"] = res.get("url")
                            evidence["identity_confirmed"] = True
                            return evidence
    except Exception as e:
        logger.error(f"Audit error for {name[:20]}: {e}")
    return evidence

async def mirror_extract_cj(cj_service, p):
    """pixel-level extraction of CJ product following 14-point standard."""
    pid = p.get("pid") or p.get("id")
    name = p.get("productNameEn") or p.get("nameEn") or p.get("productName") or "Unknown"
    
    # Cost & Logistics
    price_usd_raw = p.get("productPrice") or p.get("sellPrice") or 0.0
    try: price_usd = float(str(price_usd_raw).split(" -- ")[-1])
    except: price_usd = 0.0
    
    freight_list = await cj_service.get_freight_estimate(pid, "US")
    freight = 10.0
    if freight_list:
        try:
            cheapest = min([f for f in freight_list if f], key=lambda x: float(x.get("freightFee", 999)))
            freight = float(cheapest.get("freightFee", 10.0))
        except: pass
    landed_cost = price_usd + freight

    # Market Audit
    evidence = await find_market_evidence(name, landed_cost)
    if not evidence["identity_confirmed"] or evidence["unit_selling_price"] <= 0:
        return None
        
    m_sell = evidence["unit_selling_price"]
    target_price = round(m_sell * 0.6, 2)
    
    # Truth Model: Target Price must cover cost
    if target_price <= landed_cost:
        return None

    # Full Mirroring
    detail = await cj_service.get_product_detail(pid)
    if not detail: return None
    
    # Physical Specs
    p_w_raw = safe_float(detail.get("productWeight"))
    product_weight = p_w_raw / 1000.0 if p_w_raw > 5.0 else p_w_raw
    packing_size = {
        "length": detail.get("packingLength", 0),
        "width": detail.get("packingWidth", 0),
        "height": detail.get("packingHeight", 0),
        "unit": "cm"
    }
    
    img_list = []
    if detail.get("productImage"): img_list = detail.get("productImage").split(",")
    img_list = [img if img.startswith("http") else f"https:{img}" if img.startswith("//") else img for img in img_list if img]

    return {
        "raw_data": p,
        "detail_data": detail,
        "standard_fields": {
            "title": name, "sku": detail.get("sku") or f"CJ-{pid}", "price": target_price,
            "cost": landed_cost, "amazon_price": m_sell, "amazon_list": evidence["unit_list_price"],
            "amazon_url": evidence["market_url"], "weight": round(product_weight, 3),
            "size": packing_size, "images": img_list, "description_html": detail.get("description", ""),
            "inventory": detail.get("cjInventory", 0) + detail.get("factoryInventory", 0),
            "vendor": {
                "name": detail.get("shopName", "Artisan Partner"),
                "rating": detail.get("shopRating", 5.0),
                "id": detail.get("shopId")
            },
            "category": p.get("categoryName") or "General"
        },
        "is_cashback": (target_price / landed_cost >= 4.0)
    }

async def ingest_to_library(db, c, supply_chain):
    pid = c['raw_data'].get("pid") or c['raw_data'].get("id")
    exists = db.query(CandidateProduct).filter_by(product_id_1688=pid).first()
    if exists: return

    f = c['standard_fields']
    
    # 1. Raw Platform Archive
    try:
        db.execute(text("""
            INSERT INTO cj_raw_products (cj_pid, raw_json, title_en, source_url)
            VALUES (:pid, :json, :title, :url)
            ON CONFLICT (cj_pid) DO NOTHING
        """), {
            "pid": pid, "json": json.dumps(c['detail_data'], ensure_ascii=False),
            "title": f['title'], "url": f"https://app.cjdropshipping.com/product-detail.html?id={pid}"
        })
        db.commit()
    except: db.rollback()

    # 2. AI Polish Draft
    enriched = await supply_chain.translate_and_enrich({"title": f['title'], "category": f['category'], "price": f['cost']}, strategy="IDS_BRUTE_FORCE")

    # 3. Save Draft
    new_draft = CandidateProduct(
        product_id_1688=pid, title_zh=f['title'], title_en_preview=enriched.get("title_en") or f['title'],
        description_zh=enriched.get("description_en") or "", cost_cny=f['cost'] * 7.1,
        amazon_price=f['amazon_price'], amazon_compare_at_price=f['amazon_list'],
        market_comparison_url=f['amazon_url'], estimated_sale_price=f['price'],
        profit_ratio=f['price'] / f['cost'], images=f['images'],
        discovery_source="MASTER_FULL_SWEEP_V5.9.4", status="draft",
        source_platform="CJ", source_url=f"https://app.cjdropshipping.com/product-detail.html?id={pid}",
        structural_data={"description_html": f['description_html']},
        logistics_data={"shipping": {"product_weight": f['weight'], "weight_unit": "kg", "packing_size": f['size']}},
        raw_vendor_info=f['vendor'],
        desire_hook=enriched.get("desire_hook"), desire_logic=enriched.get("desire_logic"), desire_closing=enriched.get("desire_closing"),
        is_cashback_eligible=c['is_cashback']
    )
    try:
        db.add(new_draft)
        db.commit()
        print(f"      ✅ Draft Library Ingested: {f['title'][:30]}")
    except: db.rollback()

async def run_comprehensive_sweep():
    db = SessionLocal()
    cj = CJDropshippingService()
    sc = SupplyChainService(db)
    
    print("🚀 0Buck v5.9.4 Master Platform Sweep (Full Category Ingestion)...")
    
    categories = await cj.get_categories()
    if not categories:
        print("⚠️ Failed to fetch categories. Using broad fallback list.")
        categories = [{"categoryName": "Home Improvement", "categoryId": "EBBCB644-5D82-40AF-B293-CF9EDEFD6640"}]

    for cat in categories:
        cat_name = cat.get("categoryName")
        cat_id = cat.get("categoryId")
        print(f"\n📂 Sweeping Category: {cat_name} (ID: {cat_id})")
        
        # Search top items in category
        results = await cj.search_products(None, category_id=cat_id, size=20)
        if results:
            print(f"   ✨ Found {len(results)} candidate items. Auditing...")
            for p in results:
                try:
                    # Check deduplication first to save API calls
                    pid = p.get('pid') or p.get('id')
                    if db.query(CandidateProduct).filter_by(product_id_1688=pid).first():
                        continue
                        
                    await asyncio.sleep(random.uniform(1.0, 3.0)) # Key Rotation Friendly
                    mirror_data = await mirror_extract_cj(cj, p)
                    if mirror_data:
                        await ingest_to_library(db, mirror_data, sc)
                except Exception as e:
                    logger.error(f"Error in sweep: {e}")
        
        # Category cooldown
        await asyncio.sleep(5.0)

    db.close()
    print("\n🏁 Master Full Category Sweep Complete.")

if __name__ == "__main__":
    asyncio.run(run_comprehensive_sweep())
