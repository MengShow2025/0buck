
import asyncio
import httpx
import os
import pg8000
import ssl
import urllib.parse as urlparse

# 1. HARDCODED CONFIG FOR STABILITY (MATCHES YOUR ENV)
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
CJ_TOKEN = "API@CJ5226663@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTIyMCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlnZU5BOEs4MWFuc3dMaEduZHdXdFZFZ2RSTTZIZGVUd25tdTZJc1Y5WnF6RFZxY0U3WllMRFBvOTZMSTVnT1RmNjg0endRM1dYc05qMVNvOTVCaXkwWElXTFRwSFRDclUxaHFPYVcyVUludUxaekdNeXdIVkVmZWdiMFNJQUpnSXBXREpPRGswWHdIMXk3ejN1cmx4OVNOcUJaR2dtZGJhemszQkZ0UXBsV3lITllScWJ0ZVZpOUhhUU9RMFJzWVRTUUlSZlZLOEJGVGppdW1YaWZCcTlPdG9yQ1hLMlVYL0o1N3hiWFdQSk94K3c5Vzg3eERPY0NodlJpOFpqNFM0SENyMDdlMEF4QlcwSksrU2ZzKy8zYz0iLCJpYXQiOjE3NzU5MTUzMzJ9.dRRfoACJgf5p-uduWQ09C2YRjCBukFt0vuezs5WeXPo"
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
LOCATION_ID = 111285600559

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def monitor_stable():
    print("🕵️ 0Buck Real-time Monitor (v7.9.6 Final)")
    headers_cj = {"CJ-Access-Token": CJ_TOKEN}
    headers_sh = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
        # Load Shopify Map
        sh_map = {}
        sh_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?limit=250&fields=id,handle,tags,variants"
        try:
            sh_resp = await client.get(sh_url, headers=headers_sh)
            if sh_resp.status_code == 200:
                for p in sh_resp.json().get("products", []):
                    sh_map[p["handle"]] = p
            else:
                print(f"   ❌ Shopify Error: {sh_resp.status_code}")
                return
        except Exception as e:
            print(f"   ❌ Connection Fail: {str(e)}")
            return

        cur.execute("SELECT id, cj_pid, shopify_product_handle, title_en FROM candidate_products WHERE cj_pid IS NOT NULL AND status='synced'")
        products = cur.fetchall()
        
        print(f"🕵️ Found {len(products)} products to check in DB.")
        for p_id, cj_pid, handle, title in products:
            try:
                if handle not in sh_map:
                    print(f"   ⚠️ Handle [{handle}] not found in Shopify.")
                    continue
                
                # A. Get Data
                cj_url = f"https://developers.cjdropshipping.com/api2.0/v1/product/query?pid={cj_pid}&features=enable_inventory"
                cj_resp = await client.get(cj_url, headers=headers_cj)
                cj_data = cj_resp.json()
                if not cj_data.get("success"): continue
                
                p_info = cj_data["data"]
                listed_num = p_info.get("listedNum", 0)
                total_inv = 0
                for v in p_info.get("variants", []):
                    invs = v.get("inventories")
                    if isinstance(invs, list):
                        total_inv += sum([int(i.get("inventoryNum", 0)) for i in invs])
                    elif v.get("inventoryNum") is not None:
                        total_inv += int(v.get("inventoryNum"))

                # B. Update
                cur.execute("UPDATE candidate_products SET inventory = %s, sales_volume = %s WHERE id = %s", (total_inv, listed_num, p_id))
                conn.commit()

                # C. Push
                sh_p = sh_map[handle]
                sh_id = sh_p["id"]
                tags = [t.strip() for t in sh_p.get("tags", "").split(",") if "全网已售" not in t]
                tags.append(f"全网已售 {listed_num}")
                
                await client.put(f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products/{sh_id}.json",
                                 json={"product": {"id": sh_id, "tags": ", ".join(tags)}}, headers=headers_sh)
                
                for variant in sh_p["variants"]:
                    await client.post(f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/inventory_levels/set.json",
                                     json={"location_id": LOCATION_ID, "inventory_item_id": variant["inventory_item_id"], "available": total_inv},
                                     headers=headers_sh)
                
                print(f"   ✨ ID {p_id} | Stock: {total_inv} | Sales: {listed_num} | {title[:30]}")
                await asyncio.sleep(0.5)

            except Exception as e:
                print(f"   ⚠️ ID {p_id} Error: {str(e)}")

    conn.close()
    print("🏁 Done.")

if __name__ == "__main__":
    asyncio.run(monitor_stable())
