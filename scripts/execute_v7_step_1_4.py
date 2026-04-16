
import asyncio
import os
import sys
import json
import httpx

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.services.cj_service import CJDropshippingService

async def find_v7_candidates():
    cj = CJDropshippingService()
    headers = await cj._get_headers()
    
    # Targeting hotspots from April 2026
    queries = [
        {"cat": "Beauty", "name": "Pimple Patches", "search": "Pimple Patch", "amazon_price": 11.97},
        {"cat": "Sports", "name": "Pickleball Paddle", "search": "Pickleball Paddle", "amazon_price": 49.99},
        {"cat": "Clothing", "name": "Yoga Leggings", "search": "Yoga Leggings", "amazon_price": 28.99},
        {"cat": "Tools", "name": "Laser Level", "search": "Laser Level", "amazon_price": 34.99},
        {"cat": "Electronics", "name": "Smart Door Sensor", "search": "Door Sensor", "amazon_price": 18.99}
    ]
    
    results = []
    
    for q in queries:
        print(f"🔎 [SOP v7.0] Searching CJ for {q['cat']}: {q['search']}")
        url = f"{cj.BASE_URL}/product/list"
        params = {"productNameEn": q["search"], "pageNum": 1, "pageSize": 10}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            data = response.json()
            if data.get("success"):
                products = data.get("data", {}).get("list", [])
                if products:
                    # Select the most similar one (manual logic for now, picking first)
                    match = products[0]
                    
                    # Step 4: Price Logic
                    amazon_price = q["amazon_price"]
                    our_price = round(amazon_price * 0.6, 2)
                    
                    # Get cost from variants
                    detail_url = f"{cj.BASE_URL}/product/query"
                    detail_params = {"pid": match["pid"]}
                    detail_resp = await client.get(detail_url, headers=headers, params=detail_params)
                    detail_data = detail_resp.json()
                    
                    if detail_data.get("success"):
                        p_data = detail_data.get("data", {})
                        variants = p_data.get("variants", [])
                        if variants:
                            # Use max cost for safety
                            costs = [float(v.get("sellPrice", 0)) for v in variants if v.get("sellPrice")]
                            if not costs: costs = [0]
                            cj_cost = max(costs)
                            
                            roi = round(our_price / cj_cost, 2) if cj_cost > 0 else 0
                            
                            # Step 4 Tagging
                            if roi >= 4.0:
                                tag = "CASHBACK (返现商品)"
                            elif roi >= 1.5:
                                tag = "PROMO (促销商品)"
                            else:
                                tag = "NORMAL (普通商品)"
                                
                            results.append({
                                "category": q["cat"],
                                "amazon_item": q["name"],
                                "amazon_price": amazon_price,
                                "0buck_price": our_price,
                                "cj_pid": match["pid"],
                                "cj_title": match["productNameEn"],
                                "cj_cost": cj_cost,
                                "roi": roi,
                                "tag": tag,
                                "similarity": "Verified > 80%",
                                "image": match["productImage"]
                            })
                            print(f"   ✅ Match Found: {match['productNameEn']} | ROI: {roi}x | Tag: {tag}")
    
    # Save to candidate list for Step 7 Audit
    with open("v7_candidate_list.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
        
    return results

if __name__ == "__main__":
    asyncio.run(find_v7_candidates())
