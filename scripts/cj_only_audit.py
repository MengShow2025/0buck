
import asyncio
import os
import sys
import json
from decimal import Decimal

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.services.cj_service import CJDropshippingService

async def audit_cj_only():
    cj = CJDropshippingService()
    targets = [
        "Skechers Women's Go Walk 5 Walking Shoes",
        "4G GPS Pet Tracker for Dogs",
        "WiFi Smart Door Alarm",
        "7-Color LED Facial Mask",
        "Nautica Men's T-Shirt"
    ]
    
    results = {}
    for query in targets:
        print(f"🔎 Searching CJ for: {query}")
        products = await cj.search_products(keyword=query, size=3)
        if products:
            p = products[0]
            pid = p.get('pid') or p.get('id')
            price_raw = p.get('sellPrice', '0')
            if ' -- ' in str(price_raw):
                price = float(str(price_raw).split(' -- ')[-1])
            else:
                price = float(price_raw)
            
            # Get shipping
            estimates = await cj.get_freight_estimate(pid, "US")
            freight = 10.0
            if estimates:
                cheapest = min([f for f in estimates if f], key=lambda x: float(x.get('logisticFee', 999)))
                freight = float(cheapest.get("logisticFee", 10.0))
            
            results[query] = {
                "name": p.get('productNameEn'),
                "pid": pid,
                "cost": price,
                "shipping": freight,
                "landed": price + freight
            }
        else:
            results[query] = "NOT_FOUND"
            
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(audit_cj_only())
