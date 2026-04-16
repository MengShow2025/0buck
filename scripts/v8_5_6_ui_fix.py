import asyncio
import os
import json
import sys
from datetime import datetime

sys.path.insert(0, '/tmp/v7_packages_311')
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Database Config (Neon v2)
DATABASE_URL = "postgresql+pg8000://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb"

with open("scripts/pilot_20_assets.json", "r") as f:
    ASSETS = json.load(f)

mixed_squad = [
    {"pid": "1601295461177", "tier": "MAGNET", "cat": "Auto Tools", "amz": 19.99, "creds": "Certified ISO9001 Factory"},
    {"pid": "1601634136333", "tier": "MAGNET", "cat": "Auto Tools", "amz": 25.00, "creds": "15y OEM Experience"},
    {"pid": "1601426240173", "tier": "MAGNET", "cat": "Auto Tools", "amz": 22.00, "creds": "FCC/CE Certified"},
    {"pid": "1601229593377", "tier": "MAGNET", "cat": "Outdoor Gear", "amz": 35.00, "creds": "5000mAh Battery Audit"},
    {"pid": "1601609455105", "tier": "MAGNET", "cat": "Outdoor Gear", "amz": 28.00, "creds": "IPX7 Waterproof"},
    {"pid": "1600798477689", "tier": "MAGNET", "cat": "Outdoor Gear", "amz": 32.00, "creds": "Aerospace Grade Aluminum"},
    {"pid": "1601443430997", "tier": "NORMAL", "cat": "Auto Tools", "amz": 499.00, "creds": "Tier-1 Diagnostic OEM"},
    {"pid": "1600928302175", "tier": "NORMAL", "cat": "Auto Tools", "amz": 85.00, "creds": "Grade A Battery Cells"},
    {"pid": "1600606615977", "tier": "NORMAL", "cat": "Auto Tools", "amz": 110.00, "creds": "Heavy Duty Copper Motor"},
    {"pid": "11000021925399", "tier": "NORMAL", "cat": "Outdoor Power", "amz": 549.00, "creds": "Pure Sine Wave Tech"},
    {"pid": "1601665039555", "tier": "NORMAL", "cat": "Outdoor Power", "amz": 480.00, "creds": "Advanced Thermal Logic"},
    {"pid": "1601403830660", "tier": "NORMAL", "cat": "Outdoor Lighting", "amz": 45.00, "creds": "TPU Waterproof Seal"},
    {"pid": "1601615644636", "tier": "NORMAL", "cat": "Outdoor Lighting", "amz": 59.00, "creds": "Monocrystalline Solar"},
    {"pid": "1601706421074", "tier": "REBATE", "cat": "Auto Tools", "amz": 899.00, "creds": "Open Protocol V2.0"},
    {"pid": "1601665084906", "tier": "REBATE", "cat": "Auto Tools", "amz": 129.00, "creds": "2500A Peak Current"},
    {"pid": "1600948553486", "tier": "REBATE", "cat": "Outdoor Power", "amz": 599.00, "creds": "LiFePO4 Chemistry"},
    {"pid": "1601564721313", "tier": "REBATE", "cat": "Outdoor Power", "amz": 650.00, "creds": "BMS Protection V3.0"},
    {"pid": "1600700939363", "tier": "REBATE", "cat": "Outdoor Power", "amz": 720.00, "creds": "Low-Temp Resilience"},
    {"pid": "1600320733662", "tier": "REBATE", "cat": "Auto Tools", "amz": 95.00, "creds": "AptX Low Latency"},
    {"pid": "1601683469796", "tier": "REBATE", "cat": "Auto Tools", "amz": 1200.00, "creds": "Global Protocol Unlocked"}
]

async def fix_admin_command_data():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("🧹 Cleaning candidate_products for a fresh UI reboot...")
    session.execute(text("DELETE FROM candidate_products"))
    
    for item in mixed_squad:
        pid = item['pid']
        asset = ASSETS.get(pid, {})
        title = asset.get("title", "").split('|')[0].strip()
        title = ' '.join([w for w in title.split() if not w.isdigit() and len(w) > 1])[:80]
        image = asset.get("image", "")
        
        # Adjust prices for UI display
        sell_price = 0.0 if item['tier'] == "MAGNET" else round(item['amz'] * 0.6, 2)
        
        # UI usually expects 'images' to be an array of strings
        # and tags to be an array or specific format.
        # Let's use standard JSONB lists.
        
        sql = text("""
            INSERT INTO candidate_products 
            (product_id_1688, title_en, category_name, product_category_label, 
             sell_price, amazon_compare_at_price, images, description_en, status, admin_tags, created_at)
            VALUES (:pid, :title, :cat, :tier, :price, :amz, CAST(:images AS jsonb), :desc, 'pending', CAST(:tags AS jsonb), NOW())
        """)
        
        # 'status' might need to be 'pending' instead of 'pending_review' for some frontends
        # 'admin_tags' as a list of strings
        session.execute(sql, {
            "pid": pid,
            "title": f"{title} | 0Buck Artisan",
            "cat": item['cat'],
            "tier": item['tier'],
            "price": sell_price,
            "amz": item['amz'],
            "images": json.dumps([image]),
            "desc": f"v8.5.6 Soul Narrative Draft for {title}. Click 'Refine' in UI.",
            "tags": json.dumps([item['tier'], item['creds']]),
            "status": "pending"
        })
        print(f"✅ Ready for UI: {pid}")

    session.commit()
    session.close()

if __name__ == "__main__":
    asyncio.run(fix_admin_command_data())
