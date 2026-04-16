import os

import asyncio
import httpx
import pg8000
import ssl
import urllib.parse as urlparse
import time

# 1. CONFIG
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def get_shopify_id(client, handle):
    url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?handle={handle}&fields=id"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    try:
        resp = await client.get(url, headers=headers)
        data = resp.json()
        products = data.get("products", [])
        if products:
            return products[0].get("id")
    except Exception as e:
        print(f"Shopify Error for {handle}: {e}")
    return None

async def backfill_shopify_ids():
    print("🚀 [Backfill] Syncing Shopify Product IDs to Database...")
    conn = get_db_conn()
    cur = conn.cursor()
    
    cur.execute("SELECT id, shopify_product_handle FROM candidate_products WHERE status = 'synced' AND shopify_product_id IS NULL")
    items = cur.fetchall()
    print(f"Found {len(items)} items to backfill.")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for c_id, handle in items:
            if not handle: continue
            
            await asyncio.sleep(0.5)
            s_id = await get_shopify_id(client, handle)
            if s_id:
                cur.execute("UPDATE candidate_products SET shopify_product_id = %s WHERE id = %s", (s_id, c_id))
                conn.commit()
                print(f"   ✅ ID {c_id}: Linked Shopify ID {s_id}")
            else:
                print(f"   ⚠️ ID {c_id}: Could not find handle [{handle}] on Shopify.")
                
    conn.close()
    print("🏁 Backfill Completed.")

if __name__ == "__main__":
    asyncio.run(backfill_shopify_ids())
