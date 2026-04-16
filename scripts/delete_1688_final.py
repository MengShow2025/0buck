import os

import asyncio
import httpx
import pg8000
import ssl
import urllib.parse as urlparse

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

async def delete_1688_workflow():
    print("🔥 Starting 1688 Cleanup Workflow...")
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    # Get 1688 products from DB
    cur.execute("SELECT id, shopify_product_handle FROM products WHERE product_id_1688 IS NOT NULL")
    products = cur.fetchall()
    print(f"📦 Found {len(products)} 1688 products in database.")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for db_id, handle in products:
            if not handle: continue
            
            # 1. Delete from Shopify
            sh_prod_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?handle={handle}&fields=id"
            try:
                resp = await client.get(sh_prod_url, headers=headers)
                sh_prods = resp.json().get("products", [])
                for sh_p in sh_prods:
                    sh_id = sh_p["id"]
                    del_resp = await client.delete(f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products/{sh_id}.json", headers=headers)
                    if del_resp.status_code == 200:
                        print(f"   ✅ Deleted from Shopify: {handle}")
                    else:
                        print(f"   ❌ Shopify Delete Failed: {handle} ({del_resp.status_code})")
            except Exception as e:
                print(f"   ⚠️ Shopify Error: {str(e)}")

            # 2. Delete from Database (products table)
            try:
                cur.execute("DELETE FROM products WHERE id = %s", (db_id,))
                conn.commit()
                print(f"   ✅ Deleted from DB (products): ID {db_id}")
            except Exception as e:
                print(f"   ❌ DB Delete (products) Failed: {str(e)}")

    # 3. Also check candidate_products for 1688
    # Based on earlier check, candidate_products might not have 'product_id_1688' but might have mentions in other fields.
    # We already checked source_platform_name and source_url, let's just do a blanket delete if any survived.
    # No, better to be safe. We'll leave candidate_products as is unless we find direct links.
    
    conn.close()
    print("🏁 1688 Cleanup Complete.")

if __name__ == "__main__":
    asyncio.run(delete_1688_workflow())
