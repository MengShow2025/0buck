
import asyncio
import httpx
import os

# 0Buck Shopify Credentials
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

async def set_always_available():
    print("🚀 Disabling Shopify Inventory Management for all products...")
    
    url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?limit=250&fields=id,variants"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"❌ Error fetching products: {resp.text}")
            return
        
        products = resp.json().get("products", [])
        print(f"📦 Processing {len(products)} products...")
        
        for p in products:
            for v in p["variants"]:
                v_id = v["id"]
                # Set inventory_management to None to make it always available
                v_update_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/variants/{v_id}.json"
                v_payload = {
                    "variant": {
                        "id": v_id, 
                        "inventory_management": None, 
                        "inventory_policy": "continue"
                    }
                }
                update_resp = await client.put(v_update_url, json=v_payload, headers=headers)
                if update_resp.status_code == 200:
                    print(f"   ✅ Fixed SKU {v.get('sku')} | Always Available")
                else:
                    print(f"   ❌ Failed to fix SKU {v.get('sku')}: {update_resp.status_code}")

if __name__ == "__main__":
    asyncio.run(set_always_available())
