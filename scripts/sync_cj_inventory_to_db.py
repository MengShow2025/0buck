
import asyncio
import os
import pg8000
import ssl
import httpx
import urllib.parse as urlparse

# 1. DATABASE & CJ CONFIG
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
CJ_EMAIL = "szyungtay@gmail.com"
CJ_API_KEY = "2c0889e00f7a4bd1881989564c3e148c"

async def get_cj_token():
    url = "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={"email": CJ_EMAIL, "password": CJ_API_KEY})
        data = resp.json()
        if not data.get("success"):
            print(f"❌ CJ Auth Failed: {data.get('message')}")
            raise Exception(f"CJ Auth Failed: {data.get('message')}")
        return data["data"]["accessToken"]

async def sync_cj_inventory():
    print("🚀 Fetching real-time inventory from CJ...")
    token = await get_cj_token()
    headers = {"CJ-Access-Token": token}
    
    url = urlparse.urlparse(DB_URL)
    conn = pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )
    cur = conn.cursor()
    
    # Get CJ products from DB (where source_platform_name is CJ or has cj_pid)
    cur.execute("SELECT id, cj_pid, title_en FROM candidate_products WHERE cj_pid IS NOT NULL AND synced=True")
    products = cur.fetchall()
    print(f"📦 Found {len(products)} CJ products to sync.")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for p_id, cj_pid, title in products:
            if not cj_pid: continue
            
            # Query CJ for detailed variant info
            query_url = f"https://developers.cjdropshipping.com/api2.0/v1/product/query?pid={cj_pid}"
            resp = await client.get(query_url, headers=headers)
            data = resp.json()
            
            if data.get("success"):
                variants = data["data"].get("variants", [])
                # Sum of all variant inventories
                total_inv = sum([v.get("variantInventory", 0) for v in variants])
                
                # Update DB
                cur.execute("UPDATE candidate_products SET inventory = %s WHERE id = %s", (total_inv, p_id))
                conn.commit()
                print(f"   ✅ ID {p_id} | Total Inventory: {total_inv} | {title[:30]}")
            else:
                print(f"   ❌ Failed to fetch CJ data for PID {cj_pid}")
                
    conn.close()
    print("✨ CJ Inventory Sync to DB Complete.")

if __name__ == "__main__":
    asyncio.run(sync_cj_inventory())
