
import asyncio
import os
import pg8000
import ssl
import httpx
import urllib.parse as urlparse
from difflib import SequenceMatcher

# 1. DATABASE & CJ CONFIG
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
CJ_TOKEN = "API@CJ5226663@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTIyMCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlnZU5BOEs4MWFuc3dMaEduZHdXdFZFZ2RSTTZIZGVUd25tdTZJc1Y5WnF6RFZxY0U3WllMRFBvOTZMSTVnT1RmNjg0endRM1dYc05qMVNvOTVCaXkwWElXTFRwSFRDclUxaHFPYVcyVUludUxaekdNeXdIVkVmZWdiMFNJQUpnSXBXREpPRGswWHdIMXk3ejN1cmx4OVNOcUJaR2dtZGJhemszQkZ0UXBsV3lITllScWJ0ZVZpOUhhUU9RMFJzWVRTUUlSZlZLOEJGVGppdW1YaWZCcTlPdG9yQ1hLMlVYL0o1N3hiWFdQSk94K3c5Vzg3eERPY0NodlJpOFpqNFM0SENyMDdlMEF4QlcwSksrU2ZzKy8zYz0iLCJpYXQiOjE3NzU5MTUzMzJ9.dRRfoACJgf5p-uduWQ09C2YRjCBukFt0vuezs5WeXPo"

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

def similar(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

async def auto_remap_cj_pids():
    print("🚀 Starting AI Automated Re-mapping for CJ Products...")
    headers = {"CJ-Access-Token": CJ_TOKEN}
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    # Get products without cj_pid (focusing on Vanguard IDs 10-25 first)
    cur.execute("SELECT id, title_en FROM candidate_products WHERE cj_pid IS NULL AND title_en IS NOT NULL ORDER BY id ASC")
    products = cur.fetchall()
    print(f"📦 Found {len(products)} products to remap.")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for p_id, db_title in products:
            # Clean title
            clean_title = db_title.split("|")[0].strip().replace("0Buck Verified Artisan:", "").strip()
            # Truncate for better search results
            search_query = " ".join(clean_title.split()[:5])
            
            print(f"🔎 Searching CJ for: {search_query}...")
            search_url = f"https://developers.cjdropshipping.com/api2.0/v1/product/listV2?keyWord={urlparse.quote(search_query)}&pageSize=5"
            
            try:
                resp = await client.get(search_url, headers=headers)
                data = resp.json()
                
                if data.get("success"):
                    content = data.get("data", {}).get("content", [])
                    if not content:
                        print(f"   ⚠️ No results found for '{search_query}'")
                        continue
                        
                    results = content[0].get("productList", [])
                    best_match = None
                    highest_score = 0
                    
                    for res in results:
                        cj_title = res.get("productNameEn") or res.get("nameEn")
                        score = similar(clean_title, cj_title)
                        if score > highest_score:
                            highest_score = score
                            best_match = res
                            
                    if highest_score > 0.5:
                        cj_pid = best_match.get("pid") or best_match.get("id")
                        cur.execute("UPDATE candidate_products SET cj_pid = %s WHERE id = %s", (cj_pid, p_id))
                        conn.commit()
                        print(f"   ✅ Matched ID {p_id} -> CJ PID {cj_pid} (Score: {highest_score:.2f})")
                    else:
                        print(f"   ❌ Similarity too low ({highest_score:.2f}) for ID {p_id}")
                else:
                    print(f"   ❌ CJ Search Error: {data.get('message')}")
            except Exception as e:
                print(f"   ❌ PID {p_id} Exception: {str(e)}")
                
    conn.close()
    print("✨ AI Re-mapping Complete.")

if __name__ == "__main__":
    asyncio.run(auto_remap_cj_pids())
