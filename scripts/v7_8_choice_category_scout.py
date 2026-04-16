import asyncio
import os
import sys
import json
import time

# Add backend and temp packages to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))
sys.path.insert(0, "/tmp/v7_packages_311")

from app.services.aliexpress_service import AliExpressService
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

CATEGORIES = [
    "GaN Charger 65W 100W",
    "Smart Pet Feeder",
    "Tuya Zigbee Smart Sensor",
    "Monitor Hanging Light",
    "Smart Fingerprint Padlock",
    "Portable Power Station Solar Panel",
    "Car HUD Tire Inflator",
    "Electric Coffee Grinder",
    "Electric Hair Trimmer IPX7",
    "Handheld Vacuum Cleaner Accessories",
    "Ergonomic Laptop Stand",
    "Pulse Oximeter Heart Rate Monitor",
    "Mechanical Keyboard Switches",
    "Retro Camping Lantern",
    "Smart Watering System",
    "Laser Rangefinder Thermal Imager",
    "MagSafe Power Bank",
    "Kitchen Precision Scale",
    "Action Camera Accessories",
    "Neck Fan Hand Warmer"
]

async def scout_categories():
    ae_service = AliExpressService()
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    print(f"🚀 [Scouting] Starting Choice Local Scout for {len(CATEGORIES)} Categories...")

    for cat in CATEGORIES:
        print(f"🔍 Searching Category: {cat}")
        # 1. Search AE for products
        products = await ae_service.search_ds_products(cat)
        
        count = 0
        for p in products:
            pid = str(p.get("product_id"))
            
            # Check if exists
            cur.execute("SELECT id FROM candidate_products WHERE cj_pid = %s OR product_id_1688 = %s", (pid, pid))
            if cur.fetchone():
                continue
            
            # 2. Check for Local Warehouse
            # For scouting, we'll use a fast check (mock or limited)
            # In a real scenario, we'd call detect_local_warehouse
            # Let's assume for now we mark them for 'audit_pending'
            
            title = p.get("product_title")
            price = p.get("target_sale_price") or p.get("original_price")
            image = p.get("product_main_image_url")
            
            # 3. Inject into DB
            cur.execute("""
                INSERT INTO candidate_products (
                    cj_pid, title_en, source_cost_usd, images, status, category, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (pid, title, price, json.dumps([image]), 'audit_pending', cat))
            count += 1
            if count >= 5: break # Limit to 5 per category for initial scout
        
        conn.commit()
        print(f"   ✅ Injected {count} items for {cat}")

    cur.close()
    conn.close()
    print("🏁 Scouting Task Completed.")

if __name__ == "__main__":
    asyncio.run(scout_categories())
