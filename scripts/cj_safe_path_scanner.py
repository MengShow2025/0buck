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

async def find_market_evidence(name, landed_cost):
    """v5.8.2: Pure Truth Audit (No custom multipliers)."""
    from app.services.tools import _web_search_func
    import httpx
    
    evidence = {"selling_price": 0.0, "list_price": 0.0, "market_url": "", "pack_size": 1, "unit_selling_price": 0.0}
    
    try:
        search_query = f"{name} price on amazon.com"
        search_results = await _web_search_func(search_query)
        
        amazon_url = ""
        if search_results:
            for res in search_results:
                url = res.get("url", "").lower()
                if "amazon.com" in url and ("/dp/" in url or "/gp/product/" in url):
                    amazon_url = res.get("url")
                    break
        
        if amazon_url:
            evidence["market_url"] = amazon_url
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
                resp = await client.get(amazon_url, headers=headers)
                if resp.status_code == 200:
                    content = resp.text.lower()
                    
                    # 1. Pack Size
                    pack_match = re.search(r'(\d+)\s?-(?:pack|pcs|set|count)', content)
                    if pack_match: evidence["pack_size"] = int(pack_match.group(1))
                    
                    # 2. Extract Prices
                    price_candidates = re.findall(r'\$(\d+\.\d{2})', content)
                    if price_candidates:
                        prices = sorted([float(p) for p in price_candidates if float(p) > 1.0])
                        if prices:
                            evidence["selling_price"] = prices[0]
                            evidence["list_price"] = max(prices)
                            evidence["unit_selling_price"] = round(evidence["selling_price"] / evidence["pack_size"], 2)
                            evidence["unit_list_price"] = round(evidence["list_price"] / evidence["pack_size"], 2)
    except Exception as e:
        print(f"      ⚠️ Audit Error: {e}")
        
    return evidence

async def mirror_extract_cj(cj_service, p, sc):
    pid = p.get("pid") or p.get("id")
    name = p.get("productNameEn") or p.get("nameEn") or "Product"
    
    # Calculate Real Landed Cost
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

    # 1. Fetch REAL Market Evidence
    print(f"   🔍 Truth Audit for: {name[:30]}...")
    evidence = await find_market_evidence(name, landed_cost)
    m_sell = evidence.get("unit_selling_price", 0.0)
    
    if m_sell <= 0:
        print(f"   ⏭️ Skip: No real market price found.")
        return None
    
    # 2. Apply 0.6 Rule
    target_price = round(m_sell * 0.6, 2)
    
    # 3. Validation: Must cover cost. No arbitrary multipliers.
    if target_price < landed_cost:
        print(f"   🚫 Model Failure: 0Buck Price ${target_price} < Cost ${landed_cost:.2f}. Skip.")
        return None

    # 4. Success - Fetch Details for Draft
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

async def run_clean_audit():
    db = SessionLocal()
    cj = CJDropshippingService()
    sc = SupplyChainService(db)
    
    # Expanding to more categories to find products that fit the 0.6 rule
    search_keywords = ["Wireless Security Camera", "Smart Video Doorbell", "Smart Dog Training", "LED Therapy Mask"]
    for kw in search_keywords:
        print(f"\n📂 Searching: {kw}")
        results = await cj.search_products(kw, size=10)
        if results:
            for p in results:
                try:
                    data = await mirror_extract_cj(cj, p, sc)
                    if data:
                        # Ingest strictly verified data
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
                            discovery_source="CJ_PURE_TRUTH_V5.8.2",
                            status="approved",
                            source_platform="CJ",
                            source_url=f"https://app.cjdropshipping.com/product-detail.html?id={data['raw_data'].get('pid')}",
                            structural_data={"description_html": f['description_html']},
                            logistics_data={"shipping": {"product_weight": 0.1, "weight_unit": "kg"}}
                        )
                        db.add(new_cand)
                        db.commit()
                        print(f"      ✅ Verified Drafted: {f['title'][:20]} (0Buck: ${f['price']}, Amazon: ${f['amazon_price']})")
                except Exception as e:
                    print(f"      ❌ Error: {e}")
    db.close()

if __name__ == "__main__":
    asyncio.run(run_clean_audit())
