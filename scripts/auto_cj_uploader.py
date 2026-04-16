import os
import sys
import json
import asyncio
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.db.session import SessionLocal
from backend.app.models.product import CandidateProduct
from backend.app.services.supply_chain import SupplyChainService

load_dotenv()

async def process_batch():
    db = SessionLocal()
    sc_service = SupplyChainService(db)
    
    print("🚀 v7.0 Truth Engine: Starting Bulk Candidate Upload...")
    
    # 1. Fetch approved candidates that aren't synced yet
    candidates = db.query(CandidateProduct).filter(
        CandidateProduct.status == 'approved',
        CandidateProduct.platform_tag == 'CJ' # Focus on CJ for Truth Engine
    ).all()
    
    if not candidates:
        print("No approved CJ candidates found.")
        return

    print(f"📦 Found {len(candidates)} candidates for processing.")
    
    for c in candidates:
        try:
            print(f"🔥 Approving & Syncing: {c.title_zh} (CJ PID: {c.cj_pid})")
            # approve_candidate internally calls sync_product -> sync_to_shopify
            success = await sc_service.approve_candidate(c.id)
            if success:
                print(f"✅ Successfully published to Shopify & backed up to Notion.")
            else:
                print(f"⚠️ Failed to approve candidate {c.id}")
        except Exception as e:
            print(f"❌ Error processing candidate {c.id}: {e}")
            
    db.close()

if __name__ == "__main__":
    asyncio.run(process_batch())

if __name__ == "__main__":
    process_batch()
