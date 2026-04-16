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

async def update_shopify_tags(client, s_id, tags):
    url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products/{s_id}.json"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN, "Content-Type": "application/json"}
    payload = {"product": {"id": s_id, "tags": tags}}
    try:
        resp = await client.put(url, json=payload, headers=headers)
        if resp.status_code in (200, 201):
            return True
    except Exception as e:
        print(f"Shopify Tag Update Error for {s_id}: {e}")
    return False

async def main():
    print("🚀 [Tag Update] Updating Local Warehouse Tags for Existing Products...")
    conn = get_db_conn()
    cur = conn.cursor()
    
    # Select products that have a Shopify ID and a warehouse anchor
    cur.execute("SELECT id, shopify_product_id, warehouse_anchor, obuck_price FROM candidate_products WHERE status = 'synced' AND shopify_product_id IS NOT NULL AND warehouse_anchor IS NOT NULL")
    items = cur.fetchall()
    print(f"Found {len(items)} items to update tags for.")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for c_id, s_id, anchor, price in items:
            await asyncio.sleep(0.5)
            
            # Construct Tags
            tag_list = ["Artisan-Express"]
            if anchor:
                tag_list.extend([t.strip() for t in str(anchor).split(",")])
            if price == 0:
                tag_list.append("0-Buck-Eligible")
            
            tags_str = ", ".join(list(set(tag_list)))
            print(f"   Updating ID {c_id} (Shopify {s_id}) with tags: {tags_str}")
            
            if await update_shopify_tags(client, s_id, tags_str):
                print(f"      ✅ Updated Successfully.")
            else:
                print(f"      ❌ Update Failed.")
                
    conn.close()
    print("🏁 Tag Update Completed.")

if __name__ == "__main__":
    asyncio.run(main())
