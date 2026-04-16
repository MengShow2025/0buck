import os
import sys
import json

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def inject_v7_1_snipers():
    snipers = [
        {
            "product_id_1688": "CJ-MAG-WL-145",
            "title_zh": "15W 磁吸无线充电器 (MagSafe 兼容)",
            "amazon_link": "https://www.amazon.com/dp/B00MAGWL145",
            "amazon_sale_price": 19.99,
            "amazon_list_price": 29.99,
            "amazon_compare_at_price": 29.99,
            "cost_cny": 48.0,
            "source_cost_usd": 6.86,
            "profit_ratio": 1.75,
            "entry_tag": "Promotion", 
            "platform_tag": "CJ",
            "cj_pid": "1450628371485691904",
            "hot_rating": 4.7,
            "category_name": "Tech",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_SNIPER",
            "discovery_evidence": json.dumps({"weight": 120, "trend": "up"}),
            "images": json.dumps(["https://img.cjdropshipping.com/81addc9f.jpg"]),
            "description_zh": "15W磁吸无线充电，MagSafe兼容。"
        },
        {
            "product_id_1688": "CJ-SURGE-USB-158",
            "title_zh": "6口浪涌保护插排 (带 USB-C 接口)",
            "amazon_link": "https://www.amazon.com/dp/B00SURGE158",
            "amazon_sale_price": 29.99,
            "amazon_list_price": 39.99,
            "amazon_compare_at_price": 39.99,
            "cost_cny": 87.5,
            "source_cost_usd": 12.50,
            "profit_ratio": 1.44,
            "entry_tag": "Promotion",
            "platform_tag": "CJ",
            "cj_pid": "1585806148301389824",
            "hot_rating": 4.8,
            "category_name": "Home Improvement",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_SNIPER",
            "discovery_evidence": json.dumps({"weight": 450, "trend": "stable"}),
            "images": json.dumps(["https://img.cjdropshipping.com/1585806148301389824.jpg"]),
            "description_zh": "6个插口，带USB-C充电接口，防浪涌保护。"
        },
        {
            "product_id_1688": "CJ-WATER-PH-199",
            "title_zh": "IPX8 手机防水袋 (浮力型)",
            "amazon_link": "https://www.amazon.com/dp/B00WATER199",
            "amazon_sale_price": 14.99,
            "amazon_list_price": 19.99,
            "amazon_compare_at_price": 19.99,
            "cost_cny": 95.0,
            "source_cost_usd": 13.57,
            "profit_ratio": 0.66, 
            "entry_tag": "Promotion",
            "platform_tag": "CJ",
            "cj_pid": "1990602286773215233",
            "hot_rating": 4.9,
            "category_name": "Travel",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_SNIPER",
            "discovery_evidence": json.dumps({"weight": 45, "trend": "hot"}),
            "images": json.dumps(["https://img.cjdropshipping.com/1990602286773215233.jpg"]),
            "description_zh": "IPX8防水，带浮力，水下可触屏。"
        },
        {
            "product_id_1688": "CJ-SOLAR-G40-250",
            "title_zh": "G40 太阳能户外串灯 (25英尺/25灯)",
            "amazon_link": "https://www.amazon.com/dp/B00SOLAR250",
            "amazon_sale_price": 49.99,
            "amazon_list_price": 69.99,
            "amazon_compare_at_price": 69.99,
            "cost_cny": 32.6,
            "source_cost_usd": 4.66,
            "profit_ratio": 6.43,
            "entry_tag": "Rebate",
            "platform_tag": "CJ",
            "cj_pid": "2503080637581603900",
            "hot_rating": 4.9,
            "category_name": "Outdoor",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_SNIPER",
            "discovery_evidence": json.dumps({"weight": 200, "trend": "spring"}),
            "images": json.dumps(["https://img.cjdropshipping.com/2503080637581603900.jpg"]),
            "description_zh": "25英尺G40太阳能串灯，户外防水。"
        },
        {
            "product_id_1688": "CJ-MINI-FAN-176",
            "title_zh": "2000mAh 手持迷你风扇 (3档调节)",
            "amazon_link": "https://www.amazon.com/dp/B00MINIFAN176",
            "amazon_sale_price": 18.99,
            "amazon_list_price": 24.99,
            "amazon_compare_at_price": 24.99,
            "cost_cny": 44.1,
            "source_cost_usd": 6.30,
            "profit_ratio": 1.81,
            "entry_tag": "Promotion",
            "platform_tag": "CJ",
            "cj_pid": "1769915630616064000",
            "hot_rating": 4.6,
            "category_name": "Appliances",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_SNIPER",
            "discovery_evidence": json.dumps({"weight": 350, "trend": "summer"}),
            "images": json.dumps(["https://img.cjdropshipping.com/1769915630616064000.jpg"]),
            "description_zh": "2000mAh大电池，手持静音风扇。"
        }
    ]
    
    engine = create_engine(DATABASE_URL)
    
    print(f"🚀 v7.1 Sniper Engine: Injecting {len(snipers)} New Candidates...")
    
    with engine.connect() as conn:
        for s in snipers:
            try:
                keys = list(s.keys())
                placeholders = ", ".join([":" + k for k in keys])
                update_set = ", ".join([f"{k} = EXCLUDED.{k}" for k in keys if k != 'product_id_1688'])
                
                query = text(f"""
                    INSERT INTO candidate_products ({", ".join(keys)})
                    VALUES ({placeholders})
                    ON CONFLICT (product_id_1688) DO UPDATE SET
                    {update_set}
                """)
                conn.execute(query, s)
                print(f"   ✅ Sniper Injected: {s['title_zh']}")
            except Exception as e:
                print(f"   ❌ Error injecting {s['product_id_1688']}: {e}")
                
        conn.commit()
    print("✨ v7.1 Injection Complete.")

if __name__ == "__main__":
    inject_v7_1_snipers()
