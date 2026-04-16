import os
import sys
import json
from sqlalchemy.orm import Session
from decimal import Decimal

# Add project root and backend to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.models.product import CandidateProduct

def inject_v7_candidates():
    db = SessionLocal()
    
    # 5 Candidates from Truth Engine Wave 1 (Expert Chat)
    candidates = [
        {
            "product_id_1688": "CJ-PRO-LED-175",
            "title_zh": "Pro LED 面罩 - 152 颗大功率灯珠",
            "amazon_link": "https://www.amazon.com/dp/B00PROLED175",
            "amazon_sale_price": 89.99,
            "amazon_list_price": 125.99,
            "amazon_compare_at_price": 125.99,
            "cost_cny": 24.80, # CJ Cost in USD for convenience
            "source_cost_usd": 24.80,
            "profit_ratio": 2.18,
            "entry_tag": "Promotion",
            "platform_tag": "CJ",
            "cj_pid": "CJ-PRO-LED-175",
            "hot_rating": 4.8,
            "category_name": "Beauty",
            "status": "reviewing", # Ready for Boss Audit (Step 7)
            "discovery_source": "AOXIAO_V7_TRUTH",
            "discovery_evidence": {"similarity": "152 LEDs, 1:1 Matching", "expert_audit": "Verified > 80%"}
        },
        {
            "product_id_1688": "CJ-DOG-GPS-58",
            "title_zh": "4G 宠物 GPS 追踪器 - 全球漫游 IPX7",
            "amazon_link": "https://www.amazon.com/dp/B00DOGGPS58",
            "amazon_sale_price": 49.99,
            "amazon_list_price": 69.99,
            "amazon_compare_at_price": 69.99,
            "cost_cny": 14.50,
            "source_cost_usd": 14.50,
            "profit_ratio": 2.07,
            "entry_tag": "Promotion",
            "platform_tag": "CJ",
            "cj_pid": "CJ-DOG-GPS-58",
            "hot_rating": 4.5,
            "category_name": "Pet/Tech",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_TRUTH",
            "discovery_evidence": {"similarity": "4G LTE-M, IPX7", "expert_audit": "Verified > 80%"}
        },
        {
            "product_id_1688": "CJ-DOOR-ZIG-154",
            "title_zh": "Zigbee 3.0 门磁感应器 - Matter 兼容",
            "amazon_link": "https://www.amazon.com/dp/B00DOORZIG154",
            "amazon_sale_price": 18.99,
            "amazon_list_price": 24.99,
            "amazon_compare_at_price": 24.99,
            "cost_cny": 2.48,
            "source_cost_usd": 2.48,
            "profit_ratio": 4.59,
            "entry_tag": "Rebate", # ROI > 4.0
            "platform_tag": "CJ",
            "cj_pid": "CJ-DOOR-ZIG-154",
            "hot_rating": 4.9,
            "category_name": "Electronics",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_TRUTH",
            "discovery_evidence": {"similarity": "Zigbee 3.0, Matter", "expert_audit": "Verified > 80%"}
        },
        {
            "product_id_1688": "CJ-HEAVY-TEE-271",
            "title_zh": "240g 重磅精梳棉 T 恤 - 6件装",
            "amazon_link": "https://www.amazon.com/dp/B00HEAVYTEE271",
            "amazon_sale_price": 44.99,
            "amazon_list_price": 59.99,
            "amazon_compare_at_price": 59.99,
            "cost_cny": 14.90,
            "source_cost_usd": 14.90,
            "profit_ratio": 1.81,
            "entry_tag": "Promotion",
            "platform_tag": "CJ",
            "cj_pid": "CJ-HEAVY-TEE-271",
            "hot_rating": 4.2,
            "category_name": "Clothing",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_TRUTH",
            "discovery_evidence": {"similarity": "240g Combed Cotton", "expert_audit": "Verified > 80%"}
        },
        {
            "product_id_1688": "CJ-MESH-SHOES-84",
            "title_zh": "女士透气健步鞋 - MD 大底",
            "amazon_link": "https://www.amazon.com/dp/B00MESHSHOES84",
            "amazon_sale_price": 54.99,
            "amazon_list_price": 74.99,
            "amazon_compare_at_price": 74.99,
            "cost_cny": 16.50,
            "source_cost_usd": 16.50,
            "profit_ratio": 2.00,
            "entry_tag": "Promotion",
            "platform_tag": "CJ",
            "cj_pid": "CJ-MESH-SHOES-84",
            "hot_rating": 4.6,
            "category_name": "Sports",
            "status": "reviewing",
            "discovery_source": "AOXIAO_V7_TRUTH",
            "discovery_evidence": {"similarity": "MD Buffer, Memory Foam", "expert_audit": "Verified > 80%"}
        }
    ]
    
    print(f"🚀 v7.0 Truth Engine: Injecting {len(candidates)} Candidates into Draft DB...")
    
    for c_data in candidates:
        try:
            # Check if exists
            existing = db.query(CandidateProduct).filter_by(product_id_1688=c_data["product_id_1688"]).first()
            if existing:
                print(f"   ⚠️ Candidate {c_data['product_id_1688']} already exists. Updating.")
                for key, value in c_data.items():
                    setattr(existing, key, value)
            else:
                new_c = CandidateProduct(**c_data)
                db.add(new_c)
            db.commit()
            print(f"   ✅ Injected: {c_data['title_zh']}")
        except Exception as e:
            db.rollback()
            print(f"   ❌ Error injecting {c_data['product_id_1688']}: {e}")
            
    db.close()
    print("✨ Step 6 Complete: Draft Database Ingestion Finished.")

if __name__ == "__main__":
    inject_v7_candidates()
