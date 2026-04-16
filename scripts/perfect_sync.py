import httpx
import asyncio
import os
from datetime import datetime

shop_name = "pxjkad-zt"
access_token = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
headers = {"X-Shopify-Access-Token": access_token}

test_squad = [
    {"pid": "1601666051743", "title": "Zigbee Leakage Sensor", "cost": 3.5, "amz": 19.9, "tier": "REBATE"},
    {"pid": "1600526753845", "title": "Ewelink Smart Water Monitor", "cost": 4.2, "amz": 24.5, "tier": "REBATE"},
    {"pid": "1601719477924", "title": "Duomei Leakage Alarm", "cost": 3.8, "amz": 18.0, "tier": "REBATE"},
    {"pid": "1600517351386", "title": "4.5L Intelligent Auto Feeder", "cost": 15.0, "amz": 65.0, "tier": "REBATE"},
    {"pid": "1601223994119", "title": "15W Car Wireless Charger Stand", "cost": 8.5, "amz": 29.9, "tier": "NORMAL"},
    {"pid": "1601334992115", "title": "LED Wireless Charging Lamp", "cost": 12.0, "amz": 45.0, "tier": "REBATE"},
    {"pid": "1601445993881", "title": "Bluetooth Smart Body Fat Scale", "cost": 9.5, "amz": 32.0, "tier": "NORMAL"},
    {"pid": "1600502105657", "title": "Zigbee 3.0 Smart Gateway", "cost": 7.0, "amz": 28.0, "tier": "NORMAL"},
    {"pid": "1600994821003", "title": "IPX7 Waterproof BT Speaker", "cost": 11.0, "amz": 39.0, "tier": "NORMAL"},
    {"pid": "1601615779430", "title": "65W LED Display GaN Charger", "cost": 14.5, "amz": 49.9, "tier": "REBATE"},
    {"pid": "1601258615953", "title": "Mini Pocket Muscle Massage Gun", "cost": 18.0, "amz": 79.0, "tier": "REBATE"},
    {"pid": "1600078254875", "title": "30-Level Powerful Massage Gun", "cost": 22.0, "amz": 89.0, "tier": "REBATE"},
    {"pid": "1601586430587", "title": "Circular Smart Food Dispenser", "cost": 13.5, "amz": 55.0, "tier": "REBATE"},
    {"pid": "1601297032637", "title": "EU/US 65W GaN Wall Charger", "cost": 13.0, "amz": 45.0, "tier": "REBATE"},
    {"pid": "1601603382301", "title": "Retractable Cable 65W Fast Charger", "cost": 15.5, "amz": 59.0, "tier": "REBATE"}
]

async def sync():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Nuke
        print("🚀 Nuking Shopify...")
        while True:
            resp = await client.get(f"https://{shop_name}.myshopify.com/admin/api/2024-01/products.json?limit=250", headers=headers)
            products = resp.json().get("products", [])
            if not products: break
            tasks = [client.delete(f"https://{shop_name}.myshopify.com/admin/api/2024-01/products/{p['id']}.json", headers=headers) for p in products]
            await asyncio.gather(*tasks)
        
        # 2. Sync
        print("🚀 Syncing 15 items...")
        for item in test_squad:
            sale_price = round(item['amz'] * 0.6, 2)
            compare_at = round(item['amz'] * 0.95, 2)
            title = f"{item['title']} - Industrial Grade Truth | 0Buck Verified Artisan"
            
            payload = {
                "product": {
                    "title": title,
                    "body_html": f"v8.5 Standard Product. Sourced from {item['pid']}.",
                    "vendor": "0Buck Verified Artisan",
                    "product_type": item['tier'],
                    "status": "active",
                    "variants": [{"price": str(sale_price), "compare_at_price": str(compare_at), "sku": f"0B-{item['pid']}", "inventory_quantity": 100, "inventory_management": "shopify"}]
                }
            }
            resp = await client.post(f"https://{shop_name}.myshopify.com/admin/api/2024-01/products.json", json=payload, headers=headers)
            if resp.status_code == 201:
                print(f"✅ Synced: {item['title']}")
            else:
                print(f"❌ Failed: {item['title']} - {resp.text}")
            await asyncio.sleep(0.5)

if __name__ == "__main__":
    asyncio.run(sync())
