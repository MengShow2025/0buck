import asyncio
import os
import pg8000
import ssl
import json
import random
import urllib.parse as urlparse
from datetime import datetime

DB_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require")

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

# v8.5 Truth Protocol Data Mapping
CATEGORIES = {
    "3C_ELECTRONICS": [
        ("Fast Charger", "Stop Overheating While Charging", "GaN 100W & PD 3.0", 45.0, 9.0),
        ("USB-C Hub", "Stable Data Transfer & No Lag", "10Gbps & 10-in-1", 49.0, 16.0),
        ("TWS Earbuds", "Crystal Clear Audio & ANC", "Bluetooth 5.3 & 45dB ANC", 69.0, 22.0),
        ("Magnetic Power Bank", "Never Run Out of Power", "10000mAh & 15W MagSafe", 39.0, 12.0),
        ("Gaming Mouse", "Ultra-Fast Response & Low Latency", "12000 DPI & RGB", 29.0, 8.5)
    ],
    "SMART_HOME": [
        ("Door Sensor", "Stop False Alarms & High Costs", "Zigbee 3.0 & 2-Year Battery", 19.99, 3.5),
        ("Smart Bulb", "Perfect Ambiance Every Time", "RGB+CW & WiFi App Control", 15.0, 4.2),
        ("Motion Sensor", "Instant Alert & Matter Ready", "120 Degree & 7m Range", 25.0, 6.0),
        ("Smart Plug", "Save Energy & Timer Schedule", "16A & Energy Monitor", 12.0, 4.0),
        ("Water Leak Sensor", "100% Leak-Proof Guaranteed", "IP67 & Real-time Notify", 22.0, 5.5)
    ],
    "PET_SUPPLIES": [
        ("Pet Feeder", "Never Miss a Meal Again", "4L & 1080P Camera", 139.0, 18.5),
        ("Water Fountain", "Fresh & Filtered Water Always", "2.5L & Ultra-Quiet", 35.0, 9.5),
        ("Smart Pet Tag", "Track Your Furry Friends", "BLE 5.2 & IPX7", 18.0, 4.5),
        ("Heated Pet Bed", "Warmth & Comfort in Winter", "Safety Temp Control", 45.0, 14.0),
        ("Self-Cleaning Litter Box", "The Ultimate Hands-Free Truth", "Odor Control & Smart Sensor", 399.0, 85.0)
    ]
}

async def scale_100_v8_5():
    print("🚀 Initializing 100-Item High-Volume Expansion (v8.5 Soul Polish)...")
    conn = get_db_conn()
    cur = conn.cursor()
    
    brand = "0Buck Verified Artisan"
    base_pid = 1602000000000
    
    count = 0
    # Distribute 100 items across categories
    distribution = {"3C_ELECTRONICS": 40, "SMART_HOME": 30, "PET_SUPPLIES": 30}
    
    for cat_name, num in distribution.items():
        print(f"   📦 Processing Category: {cat_name} ({num} items)")
        items_templates = CATEGORIES[cat_name]
        
        for i in range(num):
            template = random.choice(items_templates)
            prod_name, solution, spec, amz_price, cost = template
            pid = str(base_pid + count)
            
            # v8.5 SOP: {Product} - {Solution} | {Specs} | [Brand]
            title_polished = f"{prod_name} #{random.randint(100, 999)} - {solution} | {spec} | {brand}"
            
            # Truth Table Injection
            truth_table = f"<div class='obuck-truth-table'>Origin: US Local Hub, Speed: 3-7 Days, Protocol: API 507580</div>"
            description = f"{truth_table}<h3>[Hook] Stop the Brand Markup</h3><p>Artisan factory-direct quality for {prod_name}.</p>"
            
            # Determine Tier
            if amz_price * 0.6 / (cost) >= 4.0:
                tier = "REBATE"
            elif amz_price * 0.6 / (cost) >= 1.5:
                tier = "NORMAL"
            else:
                tier = "MAGNET" # Fallback or specific logic
                
            sale_price = 0.0 if tier == "MAGNET" else amz_price * 0.6
            compare_at = amz_price * 0.95
            
            cur.execute("""
                INSERT INTO candidate_products (
                    cj_pid, title_zh, title_en, description_en, status, source_platform, 
                    warehouse_anchor, estimated_sale_price, amazon_price, 
                    amazon_list_price, freight_fee, cost_cny,
                    is_cashback_eligible, category_type, product_category_label,
                    images, product_id_1688, source_url, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                pid, prod_name, title_polished, description, 'approved', 'ALIBABA',
                'US, UK, DE', sale_price, amz_price, 
                compare_at, 6.99, cost * 7.2,
                True if tier == "REBATE" else False,
                tier, tier,
                '["https://s.alicdn.com/@sc04/kf/H71f5ef64e1e1492bbf92f9ad6de969c9i.jpg"]',
                pid, f"https://www.alibaba.com/product-detail/_{pid}.html",
                datetime.utcnow()
            ))
            count += 1

    conn.commit()
    conn.close()
    print(f"✅ Success: 100 Products Injected with v8.5 Soul Polish ({count} items total).")

if __name__ == "__main__":
    asyncio.run(scale_100_v8_5())
