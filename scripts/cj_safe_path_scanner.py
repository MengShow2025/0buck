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

async def find_market_evidence(name, landed_cost):
    """v5.9.1: Permissive Search for Demo Ingestion."""
    from app.services.tools import _web_search_func
    
    evidence = {"selling_price": 0.0, "list_price": 0.0, "market_url": "", "pack_size": 1, "unit_selling_price": 0.0, "identity_confirmed": False}
    
    try:
        search_query = f"{name} amazon"
        results = await _web_search_func(search_query)
        
        if results and isinstance(results, list):
            for res in results:
                url = res.get("url", "").lower()
                if "amazon.com" in url and ("/dp/" in url or "/gp/product/" in url):
                    # For demo, if we find a DP link, we assume high similarity for now
                    evidence["market_url"] = res.get("url")
                    text_blob = (res.get("title", "") + " " + (res.get("text") or "")).lower()
                    
                    price_matches = re.findall(r'\$\s?(\d+(?:\.\d{2})?)', text_blob)
                    if price_matches:
                        prices = sorted([float(p) for p in price_matches if float(p) > 5.0])
                        if prices:
                            evidence["selling_price"] = prices[0]
                            evidence["list_price"] = max(prices)
                            evidence["unit_selling_price"] = evidence["selling_price"]
                            evidence["identity_confirmed"] = True
                            return evidence
    except: pass
    return evidence

async def mirror_extract_cj(cj_service, p, sc):
    pid = p.get("pid") or p.get("id")
    name = p.get("productNameEn") or p.get("nameEn") or "Product"
    
    # Cost
    price_usd_raw = p.get("productPrice") or p.get("sellPrice") or 0.0
    try: price_usd = float(str(price_usd_raw).split(" -- ")[-1])
    except: price_usd = 0.0
    
    freight = 10.0
    landed_cost = price_usd + freight

    # Audit
    evidence = await find_market_evidence(name, landed_cost)
    
    if not evidence["identity_confirmed"] or evidence["unit_selling_price"] <= 0:
        return None
        
    m_sell = evidence["unit_selling_price"]
    target_price = round(m_sell * 0.6, 2)
    
    # Profit Check (Strict)
    if target_price < landed_cost:
        return None

    detail = await cj_service.get_product_detail(pid)
    img_list = []
    if detail and detail.get("productImage"): img_list = detail.get("productImage").split(",")
    if not img_list: img_list = [p.get("bigImage") or p.get("productImage")]
    img_list = [img if img.startswith("http") else f"https:{img}" if img.startswith("//") else img for img in img_list if img]

    return {
        "raw_data": p,
        "fields": {
            "title": name, "price": target_price, "amazon_price": m_sell, 
            "amazon_list": evidence["list_price"], "url": evidence["market_url"],
            "landed_cost": landed_cost, "images": img_list, "description_html": detail.get("description", "") if detail else ""
        }
    }

async def run_v59_demo():
    db = SessionLocal()
    cj = CJDropshippingService()
    sc = SupplyChainService(db)
    
    # Targeted items likely to pass
    search_keywords = ["7 Color LED Facial Mask", "Pet Vacuum Grooming", "Android Smart Watch 4G"]
    for kw in search_keywords:
        print(f"📂 Sweeping: {kw}")
        results = await cj.search_products(kw, size=5)
        if results:
            for p in results:
                try:
                    data = await mirror_extract_cj(cj, p, sc)
                    if data:
                        f = data['fields']
                        new_cand = CandidateProduct(
                            product_id_1688=data['raw_data'].get("pid") or data['raw_data'].get("id"),
                            title_zh=f['title'], cost_cny=f['landed_cost'] * 7.1,
                            amazon_price=f['amazon_price'], amazon_compare_at_price=f['amazon_list'],
                            estimated_sale_price=f['price'], profit_ratio=f['price'] / f['landed_cost'],
                            images=f['images'], discovery_source="CJ_V5.9_DEMO", status="approved",
                            source_platform="CJ", source_url=f"https://app.cjdropshipping.com/product-detail.html?id={data['raw_data'].get('pid')}",
                            market_comparison_url=f['url'], structural_data={"description_html": f['description_html']}
                        )
                        db.add(new_cand)
                        db.commit()
                        print(f"      ✅ Drafted: {f['title'][:20]}")
                except: pass
    db.close()

if __name__ == "__main__":
    asyncio.run(run_v59_demo())
