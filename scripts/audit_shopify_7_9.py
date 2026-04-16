
import asyncio
import httpx
import json
import os

SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

async def check_shopify_7_9_compliance():
    url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?limit=250"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"Error fetching products: {resp.text}")
            return
        
        products = resp.json().get("products", [])
        print(f"Total Shopify Products: {len(products)}")
        
        v7_9_count = 0
        legacy_count = 0
        duplicates = {}
        
        for p in products:
            tags = p.get("tags", "")
            title = p.get("title", "")
            sku = p.get("variants", [{}])[0].get("sku", "NO_SKU")
            
            # 7.9 indicators: specific categories or "0Buck Verified Artisan" in title
            is_7_9 = False
            if "0Buck Verified Artisan" in title:
                is_7_9 = True
            if any(t in tags for t in ["返现商品", "0元活动商品", "普通商品", "Vanguard-v1"]):
                is_7_9 = True
                
            if is_7_9:
                v7_9_count += 1
            else:
                legacy_count += 1
                
            if sku != "NO_SKU":
                if sku in duplicates:
                    duplicates[sku].append(p["id"])
                else:
                    duplicates[sku] = [p["id"]]

        print(f"\n--- 7.9 Mode Compliance Report ---")
        print(f"Fully 7.9 Aligned: {v7_9_count}")
        print(f"Legacy/Incomplete: {legacy_count}")
        
        print(f"\n--- Duplicate Report ---")
        dup_found = False
        for sku, ids in duplicates.items():
            if len(ids) > 1:
                print(f"[!] SKU {sku} has {len(ids)} instances: {ids}")
                dup_found = True
        if not dup_found:
            print("No duplicates found by SKU.")

if __name__ == "__main__":
    asyncio.run(check_shopify_7_9_compliance())
