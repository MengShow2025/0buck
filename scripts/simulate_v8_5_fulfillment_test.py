import asyncio
import os
import sys
import json
import pg8000
import ssl
import urllib.parse as urlparse

# Define basic connection logic manually to avoid pydantic/sqlalchemy issues
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

async def simulate_v8_5_fulfillment():
    conn = get_db_conn()
    cur = conn.cursor()
    try:
        # 1. Fetch the product directly from DB
        sku_to_test = "1601666051743"
        cur.execute("SELECT title_en, warehouse_anchor, product_category_label, source_cost_usd FROM products WHERE product_id_1688 = %s", (sku_to_test,))
        product_row = cur.fetchone()
        
        if not product_row:
            print(f"❌ Product {sku_to_test} not found in products table.")
            # List some products to help debug
            cur.execute("SELECT product_id_1688, title_en FROM products LIMIT 5")
            others = cur.fetchall()
            print("Available products in DB:")
            for o in others:
                print(f" - {o[0]}: {o[1][:30]}...")
            return

        title, anchors, label, cost_usd = product_row
        print(f"📦 Found Product: {title} | Anchors: {anchors} | Label: {label}")

        # 2. Mock Order Data
        user_country = "US"
        shipping_address = {
            "first_name": "John",
            "last_name": "Doe",
            "address1": "123 Truth Ave",
            "city": "San Francisco",
            "province": "California",
            "zip": "94105",
            "country_code": user_country
        }
        
        # 3. Simulate Logic from AlibabaFulfillmentService
        anchor_list = [a.strip().upper() for a in (anchors or "").split(",") if a.strip()]
        selected_warehouse = "CN"
        if user_country.upper() in anchor_list:
            selected_warehouse = user_country.upper()
            print(f"✅ SMART ROUTE: Locked to {user_country} Local Warehouse.")
        else:
            print(f"⚠️ NO LOCAL MATCH: User in {user_country}, but item only has anchors: {anchor_list}. Falling back to {selected_warehouse}.")

        # 4. Prepare Payload
        alibaba_order_payload = {
            "external_order_id": "1001",
            "shipping_address": {
                "name": f"{shipping_address['first_name']} {shipping_address['last_name']}",
                "address1": shipping_address["address1"],
                "city": shipping_address["city"],
                "province": shipping_address["province"],
                "zip": shipping_address["zip"],
                "country_code": user_country
            },
            "items": [
                {
                    "sku": sku_to_test,
                    "quantity": 1,
                    "warehouse": selected_warehouse,
                    "alibaba_pid": sku_to_test,
                    "title": title
                }
            ],
            "routing_strategy": "closest_warehouse"
        }

        print(f"✅ Simulation Complete. Final Payload:\n{json.dumps(alibaba_order_payload, indent=2)}")

    except Exception as e:
        print(f"❌ Error during simulation: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    asyncio.run(simulate_v8_5_fulfillment())
