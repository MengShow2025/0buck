
import asyncio
import httpx
import os
import pg8000
import ssl
import urllib.parse as urlparse

# 1. NEW DATABASE CONFIG (0buck-v2)
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
# 2. CJ OAUTH TOKEN
CJ_TOKEN = "API@CJ5226663@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTIyMCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlnZU5BOEs4MWFuc3dMaEduZHdXdFZFZ2RSTTZIZGVUd25tdTZJc1Y5WnF6RFZxY0U3WllMRFBvOTZMSTVnT1RmNjg0endRM1dYc05qMVNvOTVCaXkwWElXTFRwSFRDclUxaHFPYVcyVUludUxaekdNeXdIVkVmZWdiMFNJQUpnSXBXREpPRGswWHdIMXk3ejN1cmx4OVNOcUJaR2dtZGJhemszQkZ0UXBsV3lITllScWJ0ZVZpOUhhUU9RMFJzWVRTUUlSZlZLOEJGVGppdW1YaWZCcTlPdG9yQ1hLMlVYL0o1N3hiWFdQSk94K3c5Vzg3eERPY0NodlJpOFpqNFM0SENyMDdlMEF4QlcwSksrU2ZzKy8zYz0iLCJpYXQiOjE3NzU5MTUzMzJ9.dRRfoACJgf5p-uduWQ09C2YRjCBukFt0vuezs5WeXPo"

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def sync_cj_to_db():
    print("🚀 Fetching real-time inventory from CJ using OAuth Token...")
    headers = {"CJ-Access-Token": CJ_TOKEN}
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    # Get CJ products from DB
    cur.execute("SELECT id, cj_pid, title_en FROM candidate_products WHERE cj_pid IS NOT NULL")
    products = cur.fetchall()
    print(f"📦 Found {len(products)} CJ products to check.")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for p_id, cj_pid, title in products:
            if not cj_pid: continue
            
            # Use queryV2 if pid is simple digits, otherwise query
            query_url = f"https://developers.cjdropshipping.com/api2.0/v1/product/query?pid={cj_pid}"
            try:
                resp = await client.get(query_url, headers=headers)
                data = resp.json()
                
                if data.get("success"):
                    p_data = data.get("data", {})
                    variants = p_data.get("variants", [])
                    # Sum inventory across all variants
                    total_inv = sum([int(v.get("variantInventory", 0)) for v in variants])
                    
                    cur.execute("UPDATE candidate_products SET inventory = %s WHERE id = %s", (total_inv, p_id))
                    conn.commit()
                    print(f"   ✅ ID {p_id} | Inventory: {total_inv} | {title[:30]}")
                else:
                    print(f"   ❌ PID {cj_pid} error: {data.get('message')}")
            except Exception as e:
                print(f"   ❌ PID {cj_pid} Exception: {str(e)}")
                
    conn.close()
    print("✨ CJ -> DB Sync Complete.")

if __name__ == "__main__":
    asyncio.run(sync_cj_to_db())
