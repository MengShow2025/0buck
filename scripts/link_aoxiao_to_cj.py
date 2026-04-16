import asyncio
import os
import sys
import json
import re
import time
from decimal import Decimal

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.models.product import CandidateProduct
from app.services.cj_service import CJDropshippingService
from sqlalchemy import text

async def link_candidates_to_cj():
    print("🚀 Starting Target Sourcing: Linking Aoxiao Leads to CJ...")
    db = SessionLocal()
    cj = CJDropshippingService()
    
    # Fetch Leads
    leads = db.query(CandidateProduct).filter(
        CandidateProduct.discovery_source == "AOXIAO_AMZ_EXCEL_V6.1",
        CandidateProduct.status == "research_draft"
    ).all()
    
    print(f"🔎 Found {len(leads)} research leads to process.")
    
    for lead in leads:
        # Step 1: Search CJ for the title (first 5-7 words for better matching)
        clean_title = re.sub(r'[^\w\s]', '', lead.title_en_preview)
        search_query = " ".join(clean_title.split()[:6])
        
        print(f"\n📦 Sourcing: {lead.title_en_preview[:40]}...")
        print(f"   🔍 CJ Search Query: {search_query}")
        
        try:
            results = await cj.search_products(keyword=search_query, size=10)
            if not results:
                # Try with even shorter query
                search_query = " ".join(clean_title.split()[:3])
                results = await cj.search_products(keyword=search_query, size=5)
            
            if not results:
                print(f"   ❌ No CJ match found for {lead.product_id_1688}")
                continue
                
            # Step 2: Pick the best match (simplistic: first one that's similar)
            match = results[0]
            cj_pid = match.get('pid') or match.get('id')
            
            # Check for existing CJ PID in database to avoid UniqueViolation
            existing = db.query(CandidateProduct).filter(CandidateProduct.product_id_1688 == cj_pid).first()
            if existing and existing.id != lead.id:
                print(f"   ⚠️ Duplicate CJ PID: {cj_pid} (Already in DB). Skipping.")
                lead.status = "duplicate"
                lead.discovery_evidence = f"CJ PID {cj_pid} already linked to another lead."
                db.commit()
                continue
            
            # Fix: Handle CJ Sell Price ranges (e.g., '9.45 -- 9.62')
            cj_price_raw = match.get('sellPrice', '0')
            if isinstance(cj_price_raw, str) and ' -- ' in cj_price_raw:
                cj_price = float(cj_price_raw.split(' -- ')[-1]) # Take the upper bound
            else:
                try:
                    cj_price = float(cj_price_raw)
                except:
                    cj_price = 0.0
            
            cj_title = match.get('productNameEn', 'No Title')
            
            print(f"   ✅ Potential Match: {cj_title[:40]} (PID: {cj_pid})")
            print(f"   💰 CJ Base Cost: ${cj_price}")
            
            # Step 3: Fetch real logistics for this PID
            estimates = await cj.get_freight_estimate(cj_pid, "US")
            freight = 10.0 # Default
            shipping_days = "7-15 days"
            
            if estimates:
                cheapest = min([f for f in estimates if f], key=lambda x: float(x.get('logisticFee', 999)))
                freight = float(cheapest.get("logisticFee", 10.0))
                shipping_days = cheapest.get("shippingTime", "7-15 days")
            
            landed_cost = cj_price + freight
            amazon_price = float(lead.amazon_price or 0)
            
            # v6.1.7: Tactical Pricing (Fixing "Profit Black Hole")
            # Sale = Max(Amazon * 0.6, (Cost + Freight) * 1.5)
            target_06 = round(amazon_price * 0.6, 2)
            target_roi = round(landed_cost * 1.5, 2)
            target_price = max(target_06, target_roi)
            
            print(f"   🚚 Landed Cost: ${landed_cost} (Shipping: ${freight})")
            print(f"   🏷️ Amazon 0.6: ${target_06} | ROI 1.5x: ${target_roi}")
            print(f"   💎 Final 0Buck Target: ${target_price}")
            
            # Step 4: Decision Matrix
            # v6.1.7: Strict ROI Gate - Must have 10% net margin after all costs
            if target_price < landed_cost * 1.1:
                print(f"   ⚠️ ROI too low (Target {target_price} < Cost {landed_cost} * 1.1). Marking as low_margin.")
                lead.status = "low_margin"
                lead.discovery_evidence = f"ASIN matched but target price {target_price} < landed cost {landed_cost} * 1.1. (CJ PID: {cj_pid})"
            else:
                print(f"   🎯 PASS: High Margin Found!")
                lead.status = "draft" # Ready for review
                lead.discovery_source = "AOXIAO_CJ_LINKED_V6.1"
                lead.product_id_1688 = cj_pid # Link to real CJ PID
                lead.cost_cny = cj_price # For now we store in cost_cny slot but it's USD
                lead.estimated_sale_price = target_price
                lead.profit_margin = target_price - landed_cost
                
                # Update logistics JSON
                lead.logistics_data = {
                    "shipping_estimate": {
                        "fee": freight,
                        "days": shipping_days,
                        "last_updated": str(time.time())
                    }
                }
                
                # Update supplier JSON
                lead.supplier_info = {
                    "cj_pid": cj_pid,
                    "cj_title": cj_title,
                    "source": "CJ_DROPSHIPPING_V2"
                }

            db.commit()
            await asyncio.sleep(3.0) # Rate limiting
            
        except Exception as e:
            db.rollback()
            print(f"   🔥 Error sourcing {lead.product_id_1688}: {e}")
            await asyncio.sleep(5.0)

    db.close()
    print("\n🏁 Targeted Sourcing Loop Complete.")

if __name__ == "__main__":
    asyncio.run(link_candidates_to_cj())
