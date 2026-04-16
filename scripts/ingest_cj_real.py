
import asyncio
import httpx
import json
import pg8000
import ssl
import urllib.parse as urlparse

# 1. CONFIG
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
CJ_TOKEN = "API@CJ5226663@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTIyMCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlnZU5BOEs4MWFuc3dMaEduZHdXdFZFZ2RSTTZIZGVUd25tdTZJc1Y5WnF6RFZxY0U3WllMRFBvOTZMSTVnT1RmNjg0endRM1dYc05qMVNvOTVCaXkwWElXTFRwSFRDclUxaHFPYVcyVUludUxaekdNeXdIVkVmZWdiMFNJQUpnSXBXREpPRGswWHdIMXk3ejN1cmx4OVNOcUJaR2dtZGJhemszQkZ0UXBsV3lITllScWJ0ZVZpOUhhUU9RMFJzWVRTUUlSZlZLOEJGVGppdW1YaWZCcTlPdG9yQ1hLMlVYL0o1N3hiWFdQSk94K3c5Vzg3eERPY0NodlJpOFpqNFM0SENyMDdlMEF4QlcwSksrU2ZzKy8zYz0iLCJpYXQiOjE3NzU5MTUzMzJ9.dRRfoACJgf5p-uduWQ09C2YRjCBukFt0vuezs5WeXPo"

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def ingest_cj_hot_items():
    print("🚀 [Ingestion] Searching CJ for hot dropshipping items...")
    headers = {"CJ-Access-Token": CJ_TOKEN}
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    keywords = ["Smart Home", "Mini Projector", "Wireless Charger", "Massage Gun"]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for kw in keywords:
            print(f"🔍 Searching: {kw}")
            url = f"https://developers.cjdropshipping.com/api2.0/v1/product/listV2?keyWord={urlparse.quote(kw)}&size=5"
            resp = await client.get(url, headers=headers)
            data = resp.json()
            
            if data.get("success"):
                content = data.get("data", {}).get("content", [])
                if not content: continue
                
                # CJ V2 list format has a nested structure
                products = content[0].get("productList", [])
                for p in products:
                    pid = p.get("pid")
                    title = p.get("productNameEn") or p.get("nameEn")
                    price = p.get("sellPrice") # This might be a range string
                    image = p.get("bigImage")
                    
                    # Clean price (take the first number)
                    try:
                        price_val = float(price.split("-")[0].strip()) if isinstance(price, str) else float(price)
                    except:
                        price_val = 0.0
                    
                    # Inject
                    cur.execute("""
                        INSERT INTO candidate_products (
                            cj_pid, title_en, source_cost_usd, images, status, category, source_platform_name, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (cj_pid) DO UPDATE SET title_en = EXCLUDED.title_en
                    """, (pid, title, price_val, json.dumps([image]), 'audit_pending', kw, 'CJ'))
                    print(f"   ✅ Injected: {title[:30]}")
            else:
                print(f"   ❌ CJ Error: {data.get('message')}")
        
        conn.commit()
    
    conn.close()
    print("🏁 Ingestion Completed.")

if __name__ == "__main__":
    asyncio.run(ingest_cj_hot_items())
