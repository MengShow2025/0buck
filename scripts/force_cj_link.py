
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
from app.services.cj_service import CJDropshippingService

async def force_link_to_cj():
    db = SessionLocal()
    cj = CJDropshippingService()
    
    # Target leads that might have 1688 IDs or need CJ check
    leads = db.query(CandidateProduct).filter(
        CandidateProduct.discovery_source.in_(["AOXIAO_AMZ_EXCEL_V6.1", "AOXIAO_CJ_LINKED_V6.1"])
    ).all()
    
    print(f"🚀 Force-linking {len(leads)} leads to CJ-only PIDs...")
    
    for lead in leads:
        search_query = " ".join(lead.title_en_preview.split()[:5])
        print(f"🔎 Sourcing CJ for: {search_query} (Lead {lead.id})")
        
        try:
            results = await cj.search_products(keyword=search_query, size=5)
            if not results:
                print(f"   ❌ No CJ match found for {lead.id}")
                continue
            
            match = results[0]
            cj_pid = match.get('pid') or match.get('id')
            
            # Check if this is a CJ PID (starts with 1 or long number)
            # 1688 IDs are usually 12 digits, CJ PIDs are longer or string UUIDs
            
            cj_price_raw = match.get('sellPrice', '0')
            if ' -- ' in str(cj_price_raw):
                cj_price = float(str(cj_price_raw).split(' -- ')[-1])
            else:
                cj_price = float(cj_price_raw)
            
            # Update lead
            lead.product_id_1688 = cj_pid # Using this slot for CJ PID as per user directive
            lead.discovery_source = "AOXIAO_CJ_LINKED_V6.1"
            lead.cost_cny = cj_price # USD stored here
            
            # Get shipping
            estimates = await cj.get_freight_estimate(cj_pid, "US")
            freight = 10.0
            if estimates:
                cheapest = min([f for f in estimates if f], key=lambda x: float(x.get('logisticFee', 999)))
                freight = float(cheapest.get("logisticFee", 10.0))
            
            landed = cj_price + freight
            amazon_price = float(lead.amazon_price or 0)
            target_06 = round(amazon_price * 0.6, 2)
            target_roi = round(landed * 1.5, 2)
            lead.estimated_sale_price = max(target_06, target_roi)
            
            lead.logistics_data = {
                "shipping_estimate": {
                    "fee": freight,
                    "days": "7-15 days",
                    "source": "CJ_API_V2"
                }
            }
            
            if lead.estimated_sale_price < landed * 1.1:
                lead.status = "low_margin"
            else:
                lead.status = "draft"
                
            print(f"   ✅ Linked to CJ PID: {cj_pid} | Target: ${lead.estimated_sale_price}")
            db.commit()
            
        except Exception as e:
            print(f"   🔥 Error: {e}")
            db.rollback()
            
    db.close()

if __name__ == "__main__":
    asyncio.run(force_link_to_cj())
