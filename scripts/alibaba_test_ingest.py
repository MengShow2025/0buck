import asyncio
import os
import sys
import json
import pg8000
import ssl

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb"

ALIBABA_TEST_SQUAD = [
    {"pid": "1601150038470", "tier": "MAGNET", "title": "Zigbee 3.0 Wireless Door/Window Sensor", "amz": 13.00, "amz_ship": 6.99, "amz_list": 25.00, "anchor": "US, UK, DE", "cost": 3.5},
    {"pid": "1601634358290", "tier": "MAGNET", "title": "Ultra-Mini Muscle Massage Gun", "amz": 18.00, "amz_ship": 7.50, "amz_list": 35.00, "anchor": "US, DE", "cost": 2.2},
    {"pid": "1600899900958", "tier": "MAGNET", "title": "Tuya Smart Tag (AirTag Alternative)", "amz": 12.00, "amz_ship": 6.00, "amz_list": 19.00, "anchor": "US, UK", "cost": 4.5},
    {"pid": "1601401780286", "tier": "NORMAL", "title": "100W GaN Fast Charger Dual USB-C", "amz": 45.00, "amz_ship": 5.20, "amz_list": 55.00, "anchor": "US, UK, DE", "cost": 9.0},
    {"pid": "1601705811584", "tier": "NORMAL", "title": "ANC Wireless TWS Earbuds", "amz": 69.00, "amz_ship": 4.80, "amz_list": 79.00, "anchor": "US, DE, ES", "cost": 22.0},
    {"pid": "1600412883549", "tier": "NORMAL", "title": "10-in-1 USB-C Hub Docking Station", "amz": 49.00, "amz_ship": 6.00, "amz_list": 59.00, "anchor": "US, DE, FR", "cost": 16.0},
    {"pid": "1600743220556", "tier": "NORMAL", "title": "Smart WiFi Light Socket (2-Pack)", "amz": 34.00, "amz_ship": 4.50, "amz_list": 39.00, "anchor": "US, UK", "cost": 11.0},
    {"pid": "1600522849041", "tier": "REBATE", "title": "Smart APP Pet Feeder with Meal Call", "amz": 139.00, "amz_ship": 12.50, "amz_list": 159.00, "anchor": "US, DE", "cost": 18.5},
    {"pid": "1600223554817", "tier": "REBATE", "title": "10.1-inch Android 13 High-Perf Tablet", "amz": 229.00, "amz_ship": 8.20, "amz_list": 299.00, "anchor": "US, DE", "cost": 55.0},
    {"pid": "1600994821003", "tier": "REBATE", "title": "IPX7 Waterproof Bluetooth Speaker", "amz": 89.00, "amz_ship": 14.00, "amz_list": 99.00, "anchor": "US, DE, UK", "cost": 14.0}
]

async def ingest_test_squad():
    print("🚀 Initializing Alibaba-First Test Squad Ingestion (v8.5 Pricing)...")
    conn = pg8000.connect(
        user='neondb_owner',
        password='npg_MoQh4OvD1HKy',
        host='ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech',
        port=5432,
        database='neondb',
        ssl_context=ssl.create_default_context()
    )
    cur = conn.cursor()

    for item in ALIBABA_TEST_SQUAD:
        print(f"   📦 Ingesting: {item['title']} (Tier: {item['tier']})")
        
        # Calculate pricing based on v8.5 SOP
        if item['tier'] == "MAGNET":
            sale_price = 0.0
            freight_fee = item['amz_ship']
        else:
            # NORMAL and REBATE: 60% of Amazon Sale Price
            sale_price = item['amz'] * 0.6
            freight_fee = item['amz_ship'] # Our actual freight
            
        compare_at = item['amz_list'] * 0.95
            
        cur.execute("DELETE FROM candidate_products WHERE cj_pid = %s OR product_id_1688 = %s", (item['pid'], item['pid']))
        cur.execute("""
            INSERT INTO candidate_products (
                cj_pid, title_zh, status, source_platform, 
                warehouse_anchor, estimated_sale_price, amazon_price, 
                amazon_list_price, freight_fee, cost_cny,
                is_cashback_eligible, category_type, product_category_label,
                images, product_id_1688, source_url
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            item['pid'], item['title'], 'approved', 'ALIBABA',
            item['anchor'], sale_price, item['amz'], 
            compare_at, freight_fee, item['cost'] * 7.2,
            True if item['tier'] == "REBATE" else False,
            item['tier'], item['tier'],
            '["https://s.alicdn.com/@sc04/kf/H71f5ef64e1e1492bbf92f9ad6de969c9i.jpg"]',
            item['pid'],
            f"https://www.alibaba.com/product-detail/_{item['pid']}.html"
        ))

    conn.commit()
    print("✅ Alibaba-First Test Squad Ingested Successfully.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    asyncio.run(ingest_test_squad())
