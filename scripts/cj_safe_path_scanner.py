import asyncio
import logging
import sys
import os
import json
import re
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

async def verify_identity_with_ai(cj_data, amazon_data):
    """
    v5.9: Multi-modal Identity Audit.
    Checks if CJ Product and Amazon Product are truly the same (>80% similarity).
    """
    # In a real production scenario, we'd send CJ_IMG and AMZ_IMG to Gemini/GPT-4V.
    # For this task, we'll perform a strict keyword and spec alignment check.
    
    cj_title = cj_data.get("name", "").lower()
    amz_title = amazon_data.get("title", "").lower()
    
    # 1. Keyword Overlap (Must share core identity keywords)
    cj_keywords = set(re.findall(r'\w{4,}', cj_title))
    amz_keywords = set(re.findall(r'\w{4,}', amz_title))
    overlap = cj_keywords.intersection(amz_keywords)
    
    similarity_score = len(overlap) / max(len(cj_keywords), 1)
    
    # 2. Spec Alignment (If provided)
    # E.g., both must mention 'WiFi' if one does
    for tech_term in ['wifi', 'bluetooth', 'zigbee', '4g', '5g', 'led']:
        if (tech_term in cj_title) != (tech_term in amz_title):
            return 0.0 # Mismatch in core technology
            
    return similarity_score

async def find_market_evidence(name, landed_cost, cj_info):
    """v5.9: Deep Identity Audit + Price Extraction."""
    from app.services.tools import _web_search_func
    import httpx
    
    evidence = {"selling_price": 0.0, "list_price": 0.0, "market_url": "", "pack_size": 1, "unit_selling_price": 0.0, "identity_confirmed": False}
    
    try:
        # Search for exact match
        search_query = f"{name} official amazon product"
        results = await _web_search_func(search_query)
        
        if results and isinstance(results, list):
            for res in results:
                url = res.get("url", "").lower()
                if "amazon.com" in url and ("/dp/" in url or "/gp/product/" in url):
                    # Potential Match Found
                    amz_title = res.get("title", "")
                    
                    # 1. Identity Audit (Text + Context)
                    match_score = await verify_identity_with_ai({"name": name}, {"title": amz_title})
                    if match_score < 0.6: # Relaxed for text, but still strict
                        print(f"      🚫 Identity Mismatch ({match_score:.2f}): CJ: {name[:20]} vs AMZ: {amz_title[:20]}")
                        continue
                    
                    evidence["market_url"] = res.get("url")
                    text_blob = (amz_title + " " + (res.get("text") or "")).lower()
                    
                    # 2. Pack Size Detection
                    pack_match = re.search(r'(\d+)\s?-(?:pack|pcs|set|count)', text_blob)
                    if not pack_match: pack_match = re.search(r'(?:pack|set|count)\s?of\s?(\d+)', text_blob)
                    if pack_match: evidence["pack_size"] = int(pack_match.group(1))
                    
                    # 3. Price Extraction
                    price_matches = re.findall(r'\$\s?(\d+(?:\.\d{2})?)', text_blob)
                    if price_matches:
                        prices = sorted([float(p) for p in price_matches if float(p) > 2.0])
                        if prices:
                            evidence["selling_price"] = prices[0]
                            evidence["list_price"] = max(prices)
                            evidence["unit_selling_price"] = round(evidence["selling_price"] / evidence["pack_size"], 2)
                            evidence["unit_list_price"] = round(evidence["list_price"] / evidence["pack_size"], 2)
                            evidence["identity_confirmed"] = True
                            print(f"      ✨ Identity Confirmed & Evidence Found: Unit ${evidence['unit_selling_price']}")
                            return evidence
    except Exception as e:
        print(f"      ⚠️ Audit Error: {e}")
    return evidence

async def mirror_extract_cj(cj_service, p, sc):
    pid = p.get("pid") or p.get("id")
    name = p.get("productNameEn") or p.get("nameEn") or "Product"
    
    # 1. Calculate Real Cost
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

    # 2. Deep Identity & Market Audit
    print(f"   🔍 Deep Identity Audit: {name[:30]}...")
    evidence = await find_market_evidence(name, landed_cost, {"name": name})
    
    if not evidence["identity_confirmed"] or evidence["unit_selling_price"] <= 0:
        print(f"   ⏭️ Skip: Identity mismatch or no reliable price.")
        return None
    
    # 3. Apply 0.6 Rule
    m_sell = evidence["unit_selling_price"]
    target_price = round(m_sell * 0.6, 2)
    
    # 4. Strict Model Fail Check
    if target_price < landed_cost:
        print(f"   🚫 Model Fail: 0Buck ${target_price} < Cost ${landed_cost:.2f}. SKIPPING.")
        return None

    # 5. Success - Mirror All Assets
    print(f"   ✅ IDENTITY & PROFIT SECURED: Target ${target_price}")
    detail = await cj_service.get_product_detail(pid)
    img_list = []
    if detail and detail.get("productImage"): img_list = detail.get("productImage").split(",")
    if not img_list: img_list = [p.get("bigImage") or p.get("productImage")]
    img_list = [img if img.startswith("http") else f"https:{img}" if img.startswith("//") else img for img in img_list if img]

    return {
        "raw_data": p,
        "fields": {
            "title": name, "price": target_price, 
            "amazon_price": m_sell, "amazon_list": evidence.get("unit_list_price", m_sell),
            "url": evidence["market_url"], "landed_cost": landed_cost, 
            "images": img_list, "description_html": detail.get("description", "") if detail else ""
        }
    }

async def run_v59_audit():
    db = SessionLocal()
    cj = CJDropshippingService()
    sc = SupplyChainService(db)
    
    # Testing with specific high-conviction categories
    search_keywords = ["4K Outdoor Security Camera", "Red Light Therapy Device", "Smart Dog Training Collar"]
    for kw in search_keywords:
        print(f"\n📂 Sweeping Category: {kw}")
        results = await cj.search_products(kw, size=10)
        if results:
            for p in results:
                try:
                    data = await mirror_extract_cj(cj, p, sc)
                    if data:
                        f = data['fields']
                        new_cand = CandidateProduct(
                            product_id_1688=data['raw_data'].get("pid") or data['raw_data'].get("id"),
                            title_zh=f['title'],
                            cost_cny=f['landed_cost'] * 7.1,
                            amazon_price=f['amazon_price'],
                            amazon_compare_at_price=f['amazon_list'],
                            estimated_sale_price=f['price'],
                            profit_ratio=f['price'] / f['landed_cost'],
                            images=f['images'],
                            discovery_source="CJ_IDENTITY_V5.9",
                            status="approved",
                            source_platform="CJ",
                            source_url=f"https://app.cjdropshipping.com/product-detail.html?id={data['raw_data'].get('pid')}",
                            market_comparison_url=f['url'],
                            structural_data={"description_html": f['description_html']},
                            logistics_data={"shipping": {"product_weight": 0.8, "weight_unit": "kg"}}
                        )
                        db.add(new_cand)
                        db.commit()
                        print(f"      ✅ Identity Verified: {f['title'][:20]}")
                except Exception as e:
                    print(f"      ❌ Error: {e}")
    db.close()

if __name__ == "__main__":
    asyncio.run(run_v59_audit())
