
import asyncio
import os
import sys
import json
import httpx
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(project_root, "backend"))

from app.db.session import SessionLocal
from app.services.cj_service import CJDropshippingService
from app.models.product import CandidateProduct
from sqlalchemy import text

async def enrich_all():
    db = SessionLocal()
    cj = CJDropshippingService()
    
    print("🚀 Starting One-Time Enrichment (Shipping Fee & Days) for Candidates...")
    
    candidates = db.query(CandidateProduct).filter(CandidateProduct.status == 'draft').all()
    print(f"📦 Found {len(candidates)} candidates to enrich.")
    
    for c in candidates:
        pid = c.product_id_1688
        print(f"🔍 Processing: {c.title_zh[:30]} (PID: {pid})")
        
        try:
            # Get Logistics
            estimates = await cj.get_freight_estimate(pid, "US")
            if estimates:
                # Find the 'CJPacket Sensitive' or the cheapest one
                # Usually we want a balance. Let's pick the one with the best shipping time or reasonable price.
                cheapest = min(estimates, key=lambda x: float(x.get('logisticFee', 999)))
                
                shipping_info = {
                    "fee": float(cheapest.get("logisticFee", 0)),
                    "days": cheapest.get("shippingTime", "7-15 days"),
                    "method": cheapest.get("logisticName", "Unknown"),
                    "last_updated": str(asyncio.get_event_loop().time())
                }
                
                # Update DB
                current_logistics = c.logistics_data or {}
                current_logistics["shipping_estimate"] = shipping_info
                
                # Use SQL for direct update to be safe
                db.execute(text("""
                    UPDATE candidate_products 
                    SET logistics_data = :logistics
                    WHERE id = :id
                """), {"logistics": json.dumps(current_logistics), "id": c.id})
                db.commit()
                print(f"   ✅ Updated: ${shipping_info['fee']} in {shipping_info['days']}")
            else:
                print(f"   ⚠️ No shipping data for {pid}")
            
            await asyncio.sleep(2.0) # Respect Rate Limit
            
        except Exception as e:
            print(f"   ❌ Error enriching {pid}: {e}")
            db.rollback()
            if "429" in str(e):
                print("🛑 Hit 429. Pausing for 60s.")
                await asyncio.sleep(60)

    db.close()
    print("🏁 Enrichment Complete.")

if __name__ == "__main__":
    asyncio.run(enrich_all())
