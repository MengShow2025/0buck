import asyncio
import logging
import sys
import os
import json
import re
import httpx
from decimal import Decimal

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.services.supply_chain import SupplyChainService
from app.models.product import CandidateProduct
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RAINFOREST_KEY = os.getenv("RAINFOREST_API_KEY")

async def fetch_rainforest_data(search_query):
    """v6.1: Amazon Data via Rainforest."""
    params = {"api_key": RAINFOREST_KEY, "type": "search", "amazon_domain": "amazon.com", "search_term": search_query}
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get("https://api.rainforestapi.com/request", params=params)
            return response.json() if response.status_code == 200 else None
        except: return None

async def find_market_evidence(name):
    """Strict Audit for AliExpress sourcing."""
    evidence = {"selling_price": 0.0, "list_price": 0.0, "market_url": "", "pack_size": 1, "unit_selling_price": 0.0, "identity_confirmed": False}
    data = await fetch_rainforest_data(name)
    if not data or not data.get("search_results"): return evidence

    for res in data["search_results"]:
        amz_title = (res.get("title") or "").lower()
        cj_keys = set(re.findall(r'\w{4,}', name.lower()))
        amz_keys = set(re.findall(r'\w{4,}', amz_title))
        if len(cj_keys.intersection(amz_keys)) < 2: continue
            
        price_obj = res.get("price")
        if price_obj:
            sell_val = float(price_obj.get("value", 0))
            list_val = float(res.get("base_price", {}).get("value", sell_val))
            evidence["unit_selling_price"] = sell_val
            evidence["unit_list_price"] = list_val
            evidence["market_url"] = res.get("link")
            evidence["identity_confirmed"] = True
            return evidence
    return evidence

async def ingest_aliexpress_draft(p_data):
    """Ingest AliExpress source into the 14-point Draft Library."""
    db = SessionLocal()
    sc = SupplyChainService(db)
    
    name = p_data['title']
    cost = p_data['cost']
    
    print(f"🚀 AliExpress Audit: {name[:30]}... (Cost: ${cost:.2f})")
    
    # 1. Market Audit
    evidence = await find_market_evidence(name)
    if not evidence["identity_confirmed"] or evidence["unit_selling_price"] <= 0:
        print("   ⏭️ Skip: No reliable Amazon match.")
        return

    # 2. 0.6 Rule & Profit Check
    m_sell = evidence["unit_selling_price"]
    target_price = round(m_sell * 0.6, 2)
    
    if target_price <= cost:
        print(f"   🚫 Model Fail: 0Buck ${target_price} <= Cost ${cost}")
        return

    # 3. Create Draft Entry
    new_draft = CandidateProduct(
        product_id_1688=f"ALI-{p_data['id']}",
        title_zh=name, title_en_preview=name, cost_cny=cost * 7.1,
        amazon_price=m_sell, amazon_compare_at_price=evidence["unit_list_price"],
        market_comparison_url=evidence["market_url"], estimated_sale_price=target_price,
        profit_ratio=target_price / cost, images=p_data['images'],
        discovery_source="ALIEXPRESS_INTEGRATION_V6.1", status="draft",
        source_platform="ALIEXPRESS", source_url=p_data['url'],
        structural_data={"description_html": p_data['desc']},
        logistics_data={"shipping": {"product_weight": 0.5, "weight_unit": "kg"}},
        raw_vendor_info={"name": p_data['store']}
    )
    db.add(new_draft)
    db.commit()
    print(f"   ✅ AliExpress Draft Logged: {name[:20]}")
    db.close()

# Mocking AliExpress Data for Demo Ingestion
ALI_SAMPLES = [
    {
        "id": "100500123456", "title": "Baseus 65W GaN Charger Fast Charging", "cost": 18.50,
        "url": "https://aliexpress.com/item/100500123456.html", "store": "Baseus Official Store",
        "images": ["https://ae01.alicdn.com/kf/H...jpg"], "desc": "<p>High speed GaN charger...</p>"
    },
    {
        "id": "100500789012", "title": "Magnetic Levitation Moon Lamp 3D", "cost": 22.00,
        "url": "https://aliexpress.com/item/100500789012.html", "store": "Home Decor Factory",
        "images": ["https://ae01.alicdn.com/kf/S...jpg"], "desc": "<p>Floating moon light...</p>"
    }
]

async def main():
    print("🚀 0Buck v6.1 AliExpress Ingestion Standardizing...")
    for item in ALI_SAMPLES:
        await ingest_aliexpress_draft(item)

if __name__ == "__main__":
    asyncio.run(main())
