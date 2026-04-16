import os
import sys
import json

# Add custom packages path first
sys.path.append('/tmp/v7_packages_311')
# Add project root and backend to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)
sys.path.append(os.path.join(project_root, "backend"))

from sqlalchemy.orm import Session
from decimal import Decimal

from app.db.session import SessionLocal
from app.models.product import CandidateProduct
from app.services.supply_chain import SupplyChainService

async def execute_v7_final_decisions():
    db = SessionLocal()
    sc_service = SupplyChainService(db)
    
    print("🎬 v7.0 Truth Engine: Executing Final TL Decisions...")
    
    # 1. Melt #271 Heavy T-Shirt (Negative Arbitrage)
    tee = db.query(CandidateProduct).filter_by(product_id_1688="CJ-HEAVY-TEE-271").first()
    if tee:
        tee.status = 'rejected' # Melted in v7 terminology
        tee.is_melted = True
        tee.melt_reason = "Negative Arbitrage: Shipping cost ($24) exceeds value proposition."
        db.commit()
        print(f"   🔴 Melted: {tee.title_zh}")
    
    # 2. Pause #58 GPS Tracker (Regulatory Risk)
    tracker = db.query(CandidateProduct).filter_by(product_id_1688="CJ-DOG-GPS-58").first()
    if tracker:
        tracker.status = 'reviewing' # Stay in draft
        tracker.audit_notes = "PAUSED: Waiting for FCC FCC/4G Band verification (B2/B4/B12)."
        db.commit()
        print(f"   🟡 Paused: {tracker.title_zh}")
    
    # 3. Approve & Add Packing Instruction for #175 LED Mask
    mask = db.query(CandidateProduct).filter_by(product_id_1688="CJ-PRO-LED-175").first()
    if mask:
        if not mask.structural_data: mask.structural_data = {}
        mask.structural_data["packing_instruction"] = "Mandatory Air Column Bag (气柱袋增强包装)"
        mask.status = 'approved'
        db.commit()
        print(f"   🟢 Approved (with Packing Logic): {mask.title_zh}")
    
    # 4. Approve Others
    others = ["CJ-DOOR-ZIG-154", "CJ-MESH-SHOES-84"]
    for pid in others:
        cand = db.query(CandidateProduct).filter_by(product_id_1688=pid).first()
        if cand:
            cand.status = 'approved'
            db.commit()
            print(f"   🟢 Approved: {cand.title_zh}")
            
    # 5. Step 9: Batch Push Approved Items
    approved = db.query(CandidateProduct).filter_by(status='approved').all()
    print(f"🚀 Batch Pushing {len(approved)} Approved Truth Assets to Shopify...")
    
    for a in approved:
        try:
            print(f"   📤 Syncing: {a.title_zh}...")
            # This calls sync_product -> sync_to_shopify
            await sc_service.approve_candidate(a.id)
            print(f"   ✅ Done: {a.id}")
        except Exception as e:
            print(f"   ❌ Sync Failed for {a.id}: {e}")

    db.close()
    print("✨ v7.0 First Wave Deployment Complete.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(execute_v7_final_decisions())
