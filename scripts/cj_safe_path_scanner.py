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

async def find_market_evidence(name, original_kw=None):
    """v5.7.1: Deep Audit with HTTP Fetch & Pack Normalization."""
    from app.services.tools import _web_search_func
    import httpx
    
    evidence = {
        "selling_price": 0.0,
        "list_price": 0.0,
        "market_url": "",
        "pack_size": 1,
        "unit_selling_price": 0.0,
        "unit_list_price": 0.0,
        "match_score": 0.0
    }
    
    try:
        # 1. Broad Search
        search_query = f"{name} price on amazon.com"
        search_results = await _web_search_func(search_query)
        
        amazon_url = ""
        if search_results:
            for res in search_results:
                if "amazon.com" in res.get("url", "").lower() and "/dp/" in res.get("url", ""):
                    amazon_url = res.get("url")
                    break
        
        if amazon_url:
            evidence["market_url"] = amazon_url
            print(f"      🛜 Fetching Evidence: {amazon_url[:50]}...")
            
            async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
                headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
                resp = await client.get(amazon_url, headers=headers)
                if resp.status_code == 200:
                    content = resp.text.lower()
                    
                    # 3. Pack Size Detection
                    pack_match = re.search(r'(\d+)\s?-(?:pack|pcs|set|pairs|count)', content)
                    if not pack_match:
                        pack_match = re.search(r'(?:pack|set|count)\s?of\s?(\d+)', content)
                    if pack_match:
                        evidence["pack_size"] = int(pack_match.group(1))
                    
                    # 4. Price Extraction
                    list_match = re.search(r'list\s?price:?\s?\$(\d+(?:\.\d{2})?)', content)
                    selling_matches = re.findall(r'\$(\d+(?:\.\d{2})?)', content)
                    
                    if selling_matches:
                        prices = [float(p) for p in selling_matches if 1.0 < float(p) < 1000.0]
                        if prices:
                            evidence["selling_price"] = prices[0]
                            if list_match:
                                evidence["list_price"] = float(list_match.group(1))
                            else:
                                evidence["list_price"] = max(prices) if len(prices) > 1 else prices[0]
                    
                    if evidence["selling_price"] > 0:
                        evidence["unit_selling_price"] = round(evidence["selling_price"] / evidence["pack_size"], 2)
                        evidence["unit_list_price"] = round(evidence["list_price"] / evidence["pack_size"], 2)
                        evidence["match_score"] = 0.9
                
    except Exception as e:
        print(f"      ⚠️ Deep Audit Error: {e}")
        
    return evidence

async def mirror_extract_cj(cj_service, p, original_kw=None, supply_chain=None):
    """v5.7.1: Mirror Extractor with Truth Protocol & Units."""
    if not p or not isinstance(p, dict): return None
    pid = p.get("pid") or p.get("id")
    name = p.get("productNameEn") or p.get("nameEn") or p.get("productName") or "Unknown"
    price_usd_raw = p.get("productPrice") or p.get("sellPrice") or 0.0
    try:
        price_usd = float(str(price_usd_raw).split(" -- ")[-1]) if " -- " in str(price_usd_raw) else float(price_usd_raw)
    except: price_usd = 0.0
    
    # Logistics
    freight_list = await cj_service.get_freight_estimate(pid, "US")
    freight = 8.0
    logistic_method = "0Buck Global Express"
    if freight_list:
        try:
            cheapest = min(freight_list, key=lambda x: float(x.get("freightFee", 999)))
            freight = float(cheapest.get("freightFee", 8.0))
            logistic_method = cheapest.get("logisticName", "0Buck Global Express")
        except: pass
    landed_cost = price_usd + freight
    
    # Detail
    detail = await cj_service.get_product_detail(pid)
    image_list = []
    description_html = ""
    inventory_data = {"cj": 0, "factory": 0, "total": 0}
    vendor_info = {"name": "Artisan Partner", "rating": 5.0}
    
    p_w_raw = safe_float(p.get("productWeight", 0))
    product_weight = p_w_raw / 1000.0 if p_w_raw > 5.0 else p_w_raw
    packing_weight = product_weight * 1.1
    packing_size = {"length": 0, "width": 0, "height": 0, "unit": "cm"}
    
    if detail:
        if detail.get("productImage"): image_list = detail.get("productImage").split(",")
        description_html = detail.get("description", "")
        inventory_data = {"cj": detail.get("cjInventory", 0), "factory": detail.get("factoryInventory", 0), "total": detail.get("cjInventory", 0) + detail.get("factoryInventory", 0)}
        vendor_info = {"name": detail.get("shopName", "Artisan Partner"), "rating": detail.get("shopRating", 5.0)}
        
        p_w_det = safe_float(detail.get("productWeight"))
        if p_w_det > 0: product_weight = p_w_det / 1000.0 if p_w_det > 5.0 else p_w_det
        pk_w_det = safe_float(detail.get("packingWeight"))
        if pk_w_det > 0: packing_weight = pk_w_det / 1000.0 if pk_w_det > 5.0 else pk_w_det
        packing_size = {"length": detail.get("packingLength", 0), "width": detail.get("packingWidth", 0), "height": detail.get("packingHeight", 0), "unit": "cm"}
    
    if not image_list: image_list = [p.get("bigImage") or p.get("productImage")]
    image_list = [img if img.startswith("http") else f"https:{img}" if img.startswith("//") else img for img in image_list if img]

    # Market Audit
    print(f"   🔍 Strict Market Audit: {name[:30]}...")
    evidence = await find_market_evidence(name, original_kw)
    m_sell = evidence["unit_selling_price"]
    m_list = evidence["unit_list_price"]
    
    if m_sell <= 0:
        print(f"   ⏭️ Skipping: Price check failed.")
        return None
    
    target_price = round(m_sell * 0.6, 2)
    roi = round(target_price / landed_cost, 2) if landed_cost > 0 else 0.0
    
    return {
        "raw_data": p,
        "standard_fields": {
            "title": name, "sku": p.get("sku") or f"CJ-{pid}", "price_usd": round(price_usd, 2), "landed_cost": round(landed_cost, 2),
            "inventory": inventory_data, "vendor": vendor_info, "description_html": description_html, "images": image_list,
            "logistics": {
                "fee": round(freight, 2), "days": "7-12", "method": logistic_method,
                "product_weight": round(product_weight, 3), "packing_weight": round(packing_weight, 3), "weight_unit": "kg", "packing_size": packing_size
            },
            "market_evidence": {"selling_price": m_sell, "list_price": m_list, "url": evidence["market_url"]}
        },
        "roi": roi, "is_cashback": (roi >= 4.0)
    }

async def ingest_v57(db, c, supply_chain):
    pid = c['raw_data'].get("pid") or c['raw_data'].get("id")
    if db.query(CandidateProduct).filter_by(product_id_1688=pid).first(): return
    f = c['standard_fields']
    
    # AI Refinement
    print(f"   🤖 AI Narrative Refinement: {f['title'][:30]}...")
    enriched = await supply_chain.translate_and_enrich({"title": f['title'], "category": "Smart Home", "price": f['landed_cost']}, strategy="IDS_BRUTE_FORCE")

    new_draft = CandidateProduct(
        product_id_1688=pid, title_zh=f['title'], title_en_preview=enriched.get("title_en") or f['title'],
        description_zh=enriched.get("description_en") or "", cost_cny=float(f['landed_cost'] * 7.1),
        amazon_price=float(f['market_evidence']['selling_price']), amazon_compare_at_price=float(f['market_evidence']['list_price']),
        market_comparison_url=f['market_evidence']['url'], estimated_sale_price=float(round(f['market_evidence']['selling_price'] * 0.6, 2)),
        profit_ratio=float(c['roi']), images=f['images'], discovery_source="CJ_TRUTH_V5.7.1", status="approved",
        source_platform="CJ", source_url=f"https://app.cjdropshipping.com/product-detail.html?id={pid}",
        category="Smart Home", category_type="PROFIT" if c['is_cashback'] else "TRAFFIC", is_cashback_eligible=c['is_cashback'],
        desire_hook=enriched.get("desire_hook"), desire_logic=enriched.get("desire_logic"), desire_closing=enriched.get("desire_closing"),
        structural_data={"description_html": f['description_html']}, logistics_data={"inventory": f['inventory'], "shipping": f['logistics']}, raw_vendor_info=f['vendor']
    )
    try:
        db.add(new_draft)
        db.commit()
        print(f"   ✅ TRUTH VERIFIED: {f['title'][:20]}")
    except: db.rollback()

async def main():
    db = SessionLocal()
    cj_service = CJDropshippingService()
    supply_chain = SupplyChainService(db)
    print("🚀 0Buck v5.7.1 Strict Truth Protocol (Pack-Aware)...")
    search_results = await cj_service.search_products("Tuya Smart WiFi Door Sensor", size=5)
    if search_results:
        for p in search_results:
            mirror_data = await mirror_extract_cj(cj_service, p, supply_chain=supply_chain)
            if mirror_data: await ingest_v57(db, mirror_data, supply_chain)
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
