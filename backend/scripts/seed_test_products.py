import os
import sys
import json
from datetime import datetime

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.product import Product, Supplier, Base

def seed_test_data():
    db = SessionLocal()
    try:
        # 1. Create a Test Supplier
        supplier = db.query(Supplier).filter_by(supplier_id_1688="test_supp_001").first()
        if not supplier:
            supplier = Supplier(
                supplier_id_1688="test_supp_001",
                name="Shenzhen SmartLink Tech Co., Ltd (Smart Home Expert)",
                rating=4.9,
                location_province="Guangdong",
                location_city="Shenzhen",
                is_strength_merchant=True,
                can_dropship=True,
                ships_within_48h=True,
                qualifications=["CE", "FCC", "RoHS", "ISO9001"],
                custom_capability={"laser_engraving": True, "packaging": True, "min_order_custom": 1}
            )
            db.add(supplier)
            db.commit()
            db.refresh(supplier)
            print(f"Created Supplier: {supplier.name}")

        # 2. Define High-Quality Test Products (VCC 2x5 Grid Ready)
        products_data = [
            {
                "product_id_1688": "610001",
                "titles": {"en": "Smart Zigbee 3.0 Hub Gateway - Multi-mode Bluetooth/Mesh Hub", "zh": "智能Zigbee 3.0网关 - 多模蓝牙网桥"},
                "sale_price": 29.99,
                "compare_at_price": 49.00,
                "original_price": 45.0, # CNY
                "image": "https://ae01.alicdn.com/kf/S7f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Smart Home",
                "tags": ["Best Seller", "Smart Home", "Zigbee"]
            },
            {
                "product_id_1688": "610002",
                "titles": {"en": "2K Solar Security Camera - Wireless WiFi Outdoor PTZ Camera", "zh": "2K太阳能监控摄像头 - 无线WiFi户外云台"},
                "sale_price": 89.99,
                "compare_at_price": 149.00,
                "original_price": 180.0,
                "image": "https://ae01.alicdn.com/kf/S8f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Security",
                "tags": ["Outdoor", "Solar", "Security"]
            },
            {
                "product_id_1688": "610003",
                "titles": {"en": "Minimalist RGBIC LED Floor Lamp - Sync with Music", "zh": "极简RGBIC落地灯 - 音乐同步"},
                "sale_price": 54.00,
                "compare_at_price": 88.00,
                "original_price": 95.0,
                "image": "https://ae01.alicdn.com/kf/S9f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Lighting",
                "tags": ["Modern", "RGBIC", "Gift"]
            },
            {
                "product_id_1688": "610004",
                "titles": {"en": "Portable Power Station 600W - 110V/220V AC Outlet", "zh": "便携储能电源 600W - 交流输出"},
                "sale_price": 299.00,
                "compare_at_price": 499.00,
                "original_price": 850.0,
                "image": "https://ae01.alicdn.com/kf/S0f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Power",
                "tags": ["Outdoor", "High Profit", "Power"]
            },
            {
                "product_id_1688": "610005",
                "titles": {"en": "Retro Walnut Mechanical Keyboard - Gasket Mount 75%", "zh": "复古胡桃木机械键盘 - Gasket结构 75%"},
                "sale_price": 129.00,
                "compare_at_price": 199.00,
                "original_price": 280.0,
                "image": "https://ae01.alicdn.com/kf/S1f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Office",
                "tags": ["Luxury", "Retro", "Mechanical"]
            },
            {
                "product_id_1688": "610006",
                "titles": {"en": "Smart WiFi Essential Oil Diffuser - 500ml App Control", "zh": "智能WiFi香薰机 - 500ml 手机APP控制"},
                "sale_price": 35.00,
                "compare_at_price": 59.00,
                "original_price": 62.0,
                "image": "https://ae01.alicdn.com/kf/S2f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Lifestyle",
                "tags": ["Smart", "Home", "Gifts"]
            },
            {
                "product_id_1688": "610007",
                "titles": {"en": "Ultra-light Titanium Camping Pot Set - 3 Pieces", "zh": "超轻钛合金露营锅具套装 - 3件套"},
                "sale_price": 75.00,
                "compare_at_price": 115.00,
                "original_price": 145.0,
                "image": "https://ae01.alicdn.com/kf/S3f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Outdoor",
                "tags": ["Ultralight", "Titanium", "High Quality"]
            },
            {
                "product_id_1688": "610008",
                "titles": {"en": "Dual-Band WiFi 6 Mesh Router - 1500Mbps Coverage", "zh": "双频WiFi 6 Mesh路由器 - 1500Mbps 覆盖"},
                "sale_price": 49.00,
                "compare_at_price": 79.00,
                "original_price": 88.0,
                "image": "https://ae01.alicdn.com/kf/S4f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Networking",
                "tags": ["Fast", "Stable", "Office"]
            },
            {
                "product_id_1688": "610009",
                "titles": {"en": "Magnetic Wireless Charging Station 3-in-1 - iPhone/Watch/Pods", "zh": "三合一磁吸无线充电站 - 果粉全家桶"},
                "sale_price": 39.00,
                "compare_at_price": 65.00,
                "original_price": 68.0,
                "image": "https://ae01.alicdn.com/kf/S5f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Accessories",
                "tags": ["Must Have", "Gift", "iPhone"]
            },
            {
                "product_id_1688": "610010",
                "titles": {"en": "Leather Laptop Sleeve Case - Water Resistant & Shockproof", "zh": "真皮笔记本内胆包 - 防水防震"},
                "sale_price": 24.00,
                "compare_at_price": 39.00,
                "original_price": 42.0,
                "image": "https://ae01.alicdn.com/kf/S6f0c1c8a8c4f4e7b8b2b2b2b2b2b2b2b.jpg",
                "category": "Office",
                "tags": ["Premium", "Protective", "Style"]
            }
        ]

        for p in products_data:
            existing = db.query(Product).filter_by(product_id_1688=p["product_id_1688"]).first()
            if not existing:
                product = Product(
                    product_id_1688=p["product_id_1688"],
                    titles=p["titles"],
                    descriptions={"en": "Experience the next generation of smart living with our professionally curated product selection.", "zh": "体验由专业选品团队为您精心挑选的新一代智能生活方式。"},
                    sale_price=p["sale_price"],
                    compare_at_price=p["compare_at_price"],
                    original_price=p["original_price"],
                    source_cost_usd=p["original_price"] * 0.145, # Simulated buffered cost
                    images=[p["image"]],
                    media=[p["image"]],
                    category=p["category"],
                    tags=p["tags"],
                    supplier_id=supplier.id,
                    strategy_tag="IDS_CURATED",
                    is_reward_eligible=True,
                    is_active=True
                )
                db.add(product)
                print(f"Added Product: {p['titles']['en']}")
        
        db.commit()
        print("Successfully seeded 10 high-quality products for 2x5 Grid testing.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_data()
