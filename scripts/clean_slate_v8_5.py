import asyncio
import httpx
import os
import pg8000
import ssl
import urllib.parse as urlparse

DB_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require")
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def clean_slate_v8_5():
    print("🧹 [Phase 1] 0Buck v8.5 Clean Slate Operation Initiated...")
    
    # 1. Archive Old DB Products (Non-Alibaba)
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("UPDATE candidate_products SET status = 'archived' WHERE source_platform != 'ALIBABA'")
    print(f"   ✅ DB: {cur.rowcount} old CJ/Other products archived.")
    conn.commit()
    conn.close()

    # 2. Delete All Shopify Products
    print(f"   🚀 Shopify: Wiping all products from {SHOPIFY_SHOP_NAME}...")
    base_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01"
    headers = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Get products
        resp = await client.get(f"{base_url}/products.json?limit=250", headers=headers)
        products = resp.json().get("products", [])
        print(f"   🔍 Found {len(products)} products on Shopify to delete.")
        
        for p in products:
            p_id = p["id"]
            title = p["title"]
            try:
                del_resp = await client.delete(f"{base_url}/products/{p_id}.json", headers=headers)
                if del_resp.status_code == 200:
                    print(f"      🗑️ Deleted: {title} ({p_id})")
                else:
                    print(f"      ❌ Failed to delete: {title} ({del_resp.status_code})")
                await asyncio.sleep(0.5) # Anti-rate-limit delay
            except Exception as e:
                print(f"      ⚠️ Error deleting {title}: {e}")
                await asyncio.sleep(2)
                
    print("✨ [Phase 1 Complete] Slate is Clean.")

if __name__ == "__main__":
    asyncio.run(clean_slate_v8_5())
