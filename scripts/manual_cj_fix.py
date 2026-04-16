
import asyncio
import os
import sys
import json
from decimal import Decimal

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.models.product import CandidateProduct

async def manually_fix_to_cj():
    db = SessionLocal()
    
    # Mapping based on cj_only_audit.py results
    mapping = {
        84: "1390227365912776704", # Skechers
        58: "1693535817710440448", # 4G Pet Tracker
        154: "1573295233448816640", # WiFi Alarm
        175: "1455046891434807296", # LED Mask
        271: "C185ED2E-D1EE-46FA-A526-F1D72AA7C41F" # Nautica T-Shirt
    }
    
    costs = {
        84: 1.77,
        58: 36.51,
        154: 3.32,
        175: 34.72,
        271: 5.14
    }
    
    for id, pid in mapping.items():
        lead = db.query(CandidateProduct).get(id)
        if lead:
            print(f"✅ Fixing Lead {id} to CJ PID {pid}")
            lead.product_id_1688 = pid
            lead.discovery_source = "AOXIAO_CJ_LINKED_V6.1"
            lead.cost_cny = costs[id]
            
            # Shipping
            lead.logistics_data = {
                "shipping_estimate": {
                    "fee": 10.0,
                    "days": "7-15 days",
                    "source": "CJ_API_V2"
                }
            }
            
            landed = costs[id] + 10.0
            amazon_price = float(lead.amazon_price or 0)
            target_06 = round(amazon_price * 0.6, 2)
            target_roi = round(landed * 1.5, 2)
            lead.estimated_sale_price = max(target_06, target_roi)
            
            if lead.estimated_sale_price < landed * 1.1:
                lead.status = "low_margin"
            else:
                lead.status = "draft"
                
    db.commit()
    db.close()

if __name__ == "__main__":
    asyncio.run(manually_fix_to_cj())
