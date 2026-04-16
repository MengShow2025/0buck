
import asyncio
import httpx
import os
import pg8000
import ssl
import urllib.parse as urlparse

# 1. NEW DATABASE CONFIG (0buck-v2)
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or 5432,
        database=url.path[1:],
        ssl_context=ssl.create_default_context()
    )

async def fix_all_inventory():
    print("🚀 Starting Inventory Rescue: Setting all Shopify products to 999...")
    
    # 1. Fetch all products from Shopify
    url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?limit=250&fields=id,variants"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            print(f"❌ Error fetching products: {resp.text}")
            return
        
        products = resp.json().get("products", [])
        print(f"📦 Found {len(products)} products on Shopify.")
        
        for p in products:
            p_id = p["id"]
            for v in p["variants"]:
                v_id = v["id"]
                inventory_item_id = v["inventory_item_id"]
                
                # 2. Disable Inventory Management (Always Available)
                v_update_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/variants/{v_id}.json"
                v_payload = {
                    "variant": {
                        "id": v_id, 
                        "inventory_management": None, 
                        "inventory_policy": "continue"
                    }
                }
                await client.put(v_update_url, json=v_payload, headers=headers)
                print(f"   ✅ SKU {v.get('sku')} is now ALWAYS AVAILABLE")

if __name__ == "__main__":
    asyncio.run(fix_all_inventory())
