
import os
import sys
import json
import asyncio
from decimal import Decimal

# Add backend to sys.path
backend_path = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/backend"
if backend_path not in sys.path:
    sys.path.append(backend_path)

from app.services.cj_service import CJDropshippingService

# Amazon search result paths
amz_files = {
    "Massage Gun": "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/skills/alphashop-sel-product-search/amz_massage_gun.json",
    "Solar Camping Lantern": "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/skills/alphashop-sel-product-search/amz_solar_lantern.json",
    "Waterproof Phone Pouch": "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/skills/alphashop-sel-product-search/amz_phone_pouch.json",
    "Resistance Bands": "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/skills/alphashop-sel-product-search/amz_resistance_bands.json",
    "Bike Speedometer": "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/skills/alphashop-sel-product-search/amz_bike_speedo.json"
}

output_file = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/deliverables/batch_v7_1/sports_outdoors.json"

async def main():
    cj_service = CJDropshippingService()
    results = []
    
    for sub_cat, path in amz_files.items():
        print(f"Processing category: {sub_cat}")
        try:
            with open(path, 'r') as f:
                data = json.load(f)
                products = data.get("result", {}).get("data", {}).get("productList", [])
                if not products:
                    print(f"  No products found in {path}")
                    continue
                products = products[:5]
                
                for p in products:
                    title = p.get("title", "")
                    
                    # Correct price extraction using sellingPriceMin/Max
                    price_min_raw = p.get("sellingPriceMin", "US$0.0")
                    price_max_raw = p.get("sellingPriceMax", "US$0.0")
                    mid_price_raw = p.get("spItmMidPrice", "US$0.0")
                    
                    raw_price = price_min_raw
                    if raw_price == "US$0.0" or not raw_price:
                        raw_price = mid_price_raw
                    
                    if isinstance(raw_price, str):
                        # Extract digits and dots
                        price_str = "".join(c for c in raw_price if c.isdigit() or c == '.')
                        try:
                            amz_price = float(price_str)
                        except:
                            amz_price = 0.0
                    else:
                        amz_price = float(raw_price)
                        
                    # Improved search keyword logic
                    search_keyword = title
                    # Remove "X-Pack", "X Pack", etc.
                    import re
                    search_keyword = re.sub(r'^\d+[-\s][Pp]ack\s+', '', search_keyword)
                    search_keyword = re.sub(r'^[Pp]ack\s+of\s+\d+\s+', '', search_keyword)
                    
                    # Take first meaningful part
                    search_keyword = search_keyword.split(',')[0].split('-')[0].split('(')[0].strip()
                    if len(search_keyword) > 60:
                        search_keyword = search_keyword[:60]
                        
                    print(f"  Searching CJ for: {search_keyword}")
                    cj_products = await cj_service.search_products(keyword=search_keyword, size=5)
                    
                    if cj_products:
                        cj_p = cj_products[0]
                        cj_pid = cj_p.get("id") or cj_p.get("pid")
                        cj_cost_raw = cj_p.get("sellPrice") or cj_p.get("productSellPrice") or 0
                        
                        if isinstance(cj_cost_raw, str) and " -- " in cj_cost_raw:
                            cj_cost = float(cj_cost_raw.split(" -- ")[1])
                        else:
                            try:
                                cj_cost = float(cj_cost_raw)
                            except:
                                cj_cost = 0.0
                                
                        zero_buck_price = round(amz_price * 0.6, 2)
                        roi = round(zero_buck_price / cj_cost, 2) if cj_cost > 0 else 0
                        
                        item = {
                            "category": "Sports & Outdoors",
                            "sub_category": sub_cat,
                            "amazon_title": title,
                            "amazon_price": amz_price,
                            "0buck_price": zero_buck_price,
                            "cj_pid": cj_pid,
                            "cj_cost": cj_cost,
                            "roi": roi,
                            "tag": "sports_outdoors_v7_1"
                        }
                        results.append(item)
                        print(f"    Matched: {cj_pid} (Cost: {cj_cost}, ROI: {roi})")
                    else:
                        print(f"    No CJ match found for: {search_keyword}")
                        # Even if no match, maybe we can add it with null CJ data? 
                        # User wants matching products, but let's at least keep track.
                        
        except Exception as e:
            print(f"  Error processing {sub_cat}: {e}")

    # Ensure output dir exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
        
    print(f"\nDone! Saved {len(results)} products to {output_file}")

if __name__ == "__main__":
    asyncio.run(main())
