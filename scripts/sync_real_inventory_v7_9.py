
import asyncio
import httpx
import os
import pg8000
import ssl
import urllib.parse as urlparse

# 1. CONFIG
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"
CJ_TOKEN = "API@CJ5226663@CJ:eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiIzNTIyMCIsInR5cGUiOiJBQ0NFU1NfVE9LRU4iLCJzdWIiOiJicUxvYnFRMGxtTm55UXB4UFdMWnlnZU5BOEs4MWFuc3dMaEduZHdXdFZFZ2RSTTZIZGVUd25tdTZJc1Y5WnF6RFZxY0U3WllMRFBvOTZMSTVnT1RmNjg0endRM1dYc05qMVNvOTVCaXkwWElXTFRwSFRDclUxaHFPYVcyVUludUxaekdNeXdIVkVmZWdiMFNJQUpnSXBXREpPRGswWHdIMXk3ejN1cmx4OVNOcUJaR2dtZGJhemszQkZ0UXBsV3lITllScWJ0ZVZpOUhhUU9RMFJzWVRTUUlSZlZLOEJGVGppdW1YaWZCcTlPdG9yQ1hLMlVYL0o1N3hiWFdQSk94K3c5Vzg3eERPY0NodlJpOFpqNFM0SENyMDdlMEF4QlcwSksrU2ZzKy8zYz0iLCJpYXQiOjE3NzU5MTUzMzJ9.dRRfoACJgf5p-uduWQ09C2YRjCBukFt0vuezs5WeXPo"
SHOPIFY_SHOP_NAME = "pxjkad-zt"
SHOPIFY_ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
LOCATION_ID = 111285600559  # Found via debug earlier

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def sync_real_inventory_to_shopify():
    print("🚀 Synchronizing REAL supplier inventory to Shopify...")
    headers_cj = {"CJ-Access-Token": CJ_TOKEN}
    headers_sh = {"X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN}
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    # Get products that have cj_pid and shopify_product_handle
    cur.execute("SELECT id, cj_pid, shopify_product_handle, title_en FROM candidate_products WHERE cj_pid IS NOT NULL AND status='synced'")
    products = cur.fetchall()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        for p_id, cj_pid, handle, title in products:
            print(f"📦 Processing: {title[:30]}...")
            
            # 1. Get real inventory from CJ (ENABLE INVENTORY FEATURE)
            query_url = f"https://developers.cjdropshipping.com/api2.0/v1/product/query?pid={cj_pid}&features=enable_inventory"
            cj_resp = await client.get(query_url, headers=headers_cj)
            cj_data = cj_resp.json()
            
            if not cj_data.get("success"):
                print(f"   ❌ CJ Error: {cj_data.get('message')}")
                continue
                
            variants = cj_data["data"].get("variants", [])
            total_inv = 0
            for v in variants:
                # CJ v2.0: inventories is a list of objects like {'warehouseCode': 'US', 'inventoryNum': 10}
                inv_list = v.get("inventories")
                if isinstance(inv_list, list):
                    total_inv += sum([int(i.get("inventoryNum", 0)) for i in inv_list])
                elif v.get("inventoryNum") is not None:
                    total_inv += int(v.get("inventoryNum"))
            
            # 2. Update Shopify
            # First, find the Shopify Product ID and Variant IDs by handle
            sh_prod_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/products.json?handle={handle}"
            sh_resp = await client.get(sh_prod_url, headers=headers_sh)
            sh_data = sh_resp.json()
            
            if not sh_data.get("products"):
                print(f"   ⚠️ Shopify product not found for handle: {handle}")
                continue
                
            sh_product = sh_data["products"][0]
            for variant in sh_product["variants"]:
                v_id = variant["id"]
                inv_item_id = variant["inventory_item_id"]
                
                # Update variant management to 'shopify' and policy to 'deny'
                v_update_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/variants/{v_id}.json"
                v_payload = {
                    "variant": {
                        "id": v_id,
                        "inventory_management": "shopify",
                        "inventory_policy": "deny"
                    }
                }
                await client.put(v_update_url, json=v_payload, headers=headers_sh)
                
                # Set real inventory level
                inv_url = f"https://{SHOPIFY_SHOP_NAME}.myshopify.com/admin/api/2024-01/inventory_levels/set.json"
                inv_payload = {
                    "location_id": LOCATION_ID,
                    "inventory_item_id": inv_item_id,
                    "available": total_inv
                }
                await client.post(inv_url, json=inv_payload, headers=headers_sh)
                print(f"   ✅ Synced ID {p_id} | REAL STOCK: {total_inv}")

if __name__ == "__main__":
    asyncio.run(sync_real_inventory_to_shopify())
