import asyncio
import os
import sys
import json
from decimal import Decimal

# Add backend to sys.path
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.models.product import CandidateProduct
from app.services.cj_service import CJDropshippingService
cj_service = CJDropshippingService()

async def prioritize_leads(asins):
    db = SessionLocal()
    
    for asin in asins:
        lead = db.query(CandidateProduct).filter(CandidateProduct.product_id_1688 == f"ASIN:{asin}").first()
        if not lead:
            print(f"❓ ASIN:{asin} not found in database.")
            continue
            
        print(f"📦 Prioritizing Sourcing: {lead.title_en_preview[:50]}...")
        
        # Sourcing Query (clean up special chars)
        query = lead.title_en_preview.replace('(', '').replace(')', '').replace(',', '')
        query = " ".join(query.split()[:8]) # Max 8 words for CJ search
        
        print(f"   🔍 CJ Search Query: {query}")
        
        try:
            results = await cj_service.search_products(keyword=query)
            if not results:
                print(f"   ❌ No results for {query}")
                continue
                
            # Step 2: Pick the best match
            match = results[0]
            cj_pid = match.get('pid') or match.get('id')
            
            # Check for existing CJ PID
            existing = db.query(CandidateProduct).filter(CandidateProduct.product_id_1688 == cj_pid).first()
            if existing and existing.id != lead.id:
                print(f"   ⚠️ Duplicate CJ PID: {cj_pid}. Skipping.")
                continue

            # Price handling
            cj_price_raw = match.get('sellPrice', '0')
            if isinstance(cj_price_raw, str) and ' -- ' in cj_price_raw:
                cj_price = float(cj_price_raw.split(' -- ')[-1])
            else:
                try:
                    cj_price = float(cj_price_raw)
                except:
                    cj_price = 0.0
            
            # Step 3: Logistics Audit (V2 API)
            print(f"   🚛 Fetching logistics for PID: {cj_pid}")
            logistics_list = await cj_service.get_freight_estimate(
                pid=cj_pid,
                country_code="US"
            )
            
            # get_freight_estimate returns a list of shipping options
            if logistics_list and isinstance(logistics_list, list):
                # Pick the cheapest or default one
                logistics = logistics_list[0]
                shipping_fee = float(logistics.get('logisticFee', 10.0))
            else:
                logistics = {}
                shipping_fee = 10.0
            landed_cost = cj_price + shipping_fee
            
            # Step 4: 0.6 Rule Audit
            amazon_price = float(lead.amazon_compare_at_price or lead.amazon_price or 0.0)
            target_price = float(round(Decimal(str(amazon_price)) * Decimal("0.6"), 2))
            
            print(f"   💰 CJ Base Cost: ${cj_price}")
            print(f"   🚚 Landed Cost: ${landed_cost} (Shipping: ${shipping_fee})")
            print(f"   🏷️ 0Buck Target (60%): ${target_price} vs Amazon: ${amazon_price}")

            if target_price >= landed_cost * 1.1:
                print(f"   🎯 PASS: High Margin Found!")
                lead.status = "draft"
                lead.discovery_source = "AOXIAO_CJ_LINKED_V6.1"
                lead.product_id_1688 = cj_pid # Update with real PID
                lead.source_url = f"https://cjdropshipping.com/product-detail.html?id={cj_pid}"
                lead.cost_cny = cj_price * 7.2 # Approximation for records
                lead.estimated_sale_price = target_price
                lead.logistics_data = logistics
                db.commit()
            else:
                print(f"   ⚠️ ROI too low (Target {target_price} < Cost {landed_cost} * 1.1). Marking as low_margin.")
                lead.status = "low_margin"
                db.commit()
                
        except Exception as e:
            print(f"   🔥 Error processing {asin}: {e}")
            db.rollback()

    db.close()

if __name__ == "__main__":
    asins = ['B0BJZ9GT1J', 'B0F5LYZRVL', 'B0FJ6CNXYH']
    asyncio.run(prioritize_leads(asins))
