
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

async def ingest_cj_v3():
    print("🚀 [Ingestion V3] Importing CJ Hot Products...")
    headers = {"CJ-Access-Token": CJ_TOKEN}
    conn = get_db_conn()
    cur = conn.cursor()
    
    keywords = ["Smart Watch", "Robot Vacuum", "Humidifier", "Electric Toothbrush"]
    
    async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
        for kw in keywords:
            print(f"🔍 Keyword: {kw}")
            url = f"https://developers.cjdropshipping.com/api2.0/v1/product/listV2?keyWord={urlparse.quote(kw)}&size=5"
            resp = await client.get(url, headers=headers)
            data = resp.json()
            
            if data.get("success"):
                content = data.get("data", {}).get("content", [])
                if not content: continue
                for category_item in content:
                    products = category_item.get("productList", [])
                    for p in products:
                        pid = str(p.get("id") or "None")
                        if pid == "None": continue
                        title = p.get("productNameEn") or p.get("nameEn")
                        price = p.get("sellPrice")
                        image = p.get("bigImage")
                        listed_num = p.get("listedNum", 0)
                        
                        try:
                            price_val = float(str(price).split("-")[0].strip())
                        except:
                            price_val = 0.0
                        
                        # Check if exists
                        cur.execute("SELECT id FROM candidate_products WHERE cj_pid = %s", (pid,))
                        if cur.fetchone():
                            cur.execute("""
                                UPDATE candidate_products SET 
                                    title_en = %s, sell_price = %s, sales_volume = %s, updated_at = NOW()
                                WHERE cj_pid = %s
                            """, (title, price_val, listed_num, pid))
                        else:
                            cur.execute("""
                                INSERT INTO candidate_products (
                                    cj_pid, title_en, sell_price, images, status, category, source_platform_name, sales_volume, updated_at
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                            """, (pid, title, price_val, json.dumps([image]), 'approved', kw, 'CJ', listed_num))
                            print(f"   ✅ Injected: {title[:30]}")
                conn.commit()
            else:
                print(f"   ❌ CJ Error: {data.get('message')}")
    
    conn.close()
    print("🏁 Ingestion V3 Completed.")

if __name__ == "__main__":
    asyncio.run(ingest_cj_v3())
