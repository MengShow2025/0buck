
import asyncio
import httpx
import json
import pg8000
import ssl
import urllib.parse as urlparse
import time

# 1. CONFIG
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
CJ_TOKEN = "API@CJ5226663@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTIyMCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlnZU5BOEs4MWFuc3dMaEduZHdXdFZFZ2RSTTZIZGVUd25tdTZJc1Y5WnF6RFZxY0U3WllMRFBvOTZMSTVnT1RmNjg0endRM1dYc05qMVNvOTVCaXkwWElXTFRwSFRDclUxaHFPYVcyVUludUxaekdNeXdIVkVmZWdiMFNJQUpnSXBXREpPRGswWHdIMXk3ejN1cmx4OVNOcUJaR2dtZGJhemszQkZ0UXBsV3lITllScWJ0ZVZpOUhhUU9RMFJzWVRTUUlSZlZLOEJGVGppdW1YaWZCcTlPdG9yQ1hLMlVYL0o1N3hiWFdQSk94K3c5Vzg3eERPY0NodlJpOFpqNFM0SENyMDdlMEF4QlcwSksrU2ZzKy8zYz0iLCJpYXQiOjE3NzU5MTUzMzJ9.dRRfoACJgf5p-uduWQ09C2YRjCBukFt0vuezs5WeXPo"
BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def get_inventory_details(client, pid, headers):
    url = f"{BASE_URL}/product/stock/getInventoryByPid?pid={pid}"
    try:
        resp = await client.get(url, headers=headers)
        data = resp.json()
        if data.get("success"):
            return data.get("data", {})
    except Exception:
        pass
    return {}

def analyze_warehouse(inventory_data):
    inventories = inventory_data.get('inventories', [])
    anchors = []
    total_stock = 0
    for inv in inventories:
        country = inv.get('countryCode', '').upper()
        stock = inv.get('totalInventoryNum', 0)
        total_stock += stock
        if stock > 0 and country:
            anchors.append(country)
    
    # If multiple, prioritize US/EU if present, but for labels we want all
    if not anchors:
        return "CN", 0
    return ", ".join(list(set(anchors))), total_stock

async def backfill_warehouse():
    print("🚀 [Backfill] Filling warehouse anchors for synced items...")
    headers = {"CJ-Access-Token": CJ_TOKEN}
    conn = get_db_conn()
    cur = conn.cursor()
    
    # Target products that are synced but have no warehouse anchor
    cur.execute("SELECT id, cj_pid FROM candidate_products WHERE status = 'synced' AND warehouse_anchor IS NULL")
    items = cur.fetchall()
    print(f"Found {len(items)} items to backfill.")
    
    async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
        for c_id, pid in items:
            if not pid or pid == 'None':
                print(f"   ⚠️ ID {c_id}: No PID.")
                continue
            
            await asyncio.sleep(1.2)
            print(f"   🔍 Checking ID {c_id} (PID {pid})...")
            inv_data = await get_inventory_details(client, pid, headers)
            anchor, stock = analyze_warehouse(inv_data)
            
            cur.execute("""
                UPDATE candidate_products SET 
                warehouse_anchor = %s, inventory = %s, inventory_detail = %s
                WHERE id = %s
            """, (anchor, stock, json.dumps(inv_data), c_id))
            conn.commit()
            print(f"      ✅ Updated: {anchor} (Stock: {stock})")
            
    conn.close()
    print("🏁 Backfill Completed.")

if __name__ == "__main__":
    asyncio.run(backfill_warehouse())
