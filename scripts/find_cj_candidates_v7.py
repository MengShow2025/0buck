
import asyncio
import os
import sys
import json
import httpx

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.services.cj_service import CJDropshippingService

async def find_cj_matches():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    queries = [
        {"name": "BIODANCE Bio-Collagen Mask", "search": "Bio-Collagen Face Mask", "amazon_price": 19.00},
        {"name": "Liquid I.V. Hydration Multiplier", "search": "Hydration Multiplier Powder Electrolyte", "amazon_price": 24.99},
        {"name": "Crocs Classic Clogs", "search": "EVA Clogs Garden Shoes", "amazon_price": 49.99},
        {"name": "TERRO Liquid Ant Baits", "search": "Ant Killer Bait Station", "amazon_price": 11.97},
        {"name": "Gorilla Waterproof Patch & Seal Tape", "search": "Waterproof Seal Repair Tape", "amazon_price": 12.97}
    ]
    
    results = []
    
    for q in queries:
        print(f"🔎 Searching CJ for: {q['search']}")
        url = f"{cj.BASE_URL}/product/list"
        params = {"productNameEn": q["search"], "pageNum": 1, "pageSize": 5}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            data = response.json()
            if data.get("success"):
                products = data.get("data", {}).get("list", [])
                if products:
                    match = products[0]
                    # Get detail to check cost
                    detail_url = f"{cj.BASE_URL}/product/query"
                    detail_params = {"pid": match["pid"]}
                    detail_resp = await client.get(detail_url, headers=headers, params=detail_params)
                    detail_data = detail_resp.json()
                    
                    if detail_data.get("success"):
                        p_data = detail_data.get("data", {})
                        variants = p_data.get("variants", [])
                        if variants:
                            cost = float(variants[0].get("sellPrice", 0))
                            results.append({
                                "name": q["name"],
                                "amazon_price": q["amazon_price"],
                                "cj_pid": match["pid"],
                                "cj_title": match["productNameEn"],
                                "cj_cost": cost,
                                "cj_image": match["productImage"],
                                "cj_desc": p_data.get("productDescription", "")
                            })
                            print(f"   ✅ Found: {match['productNameEn']} (Cost: ${cost})")
                else:
                    print(f"   ❌ No matches found on CJ.")
            else:
                 print(f"   ❌ Search failed: {data.get('message')}")
                 
    print("\n--- Final Candidate List ---")
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(find_cj_matches())
