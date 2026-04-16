import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')
# Add backend path
sys.path.insert(0, os.path.abspath('backend'))

import asyncio
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services.auto_audit import AutoAuditRobot

async def run_rainforest_audit():
    """
    v7.1 Truth Audit: Verifying Reviewing Candidates via Rainforest.
    """
    db = SessionLocal()
    try:
        from app.models.product import CandidateProduct
        # Ensure we can import other parts
        audit_robot = AutoAuditRobot(db)
        
        # Get candidates in 'reviewing' status
        candidates = db.query(CandidateProduct).filter(
            CandidateProduct.status == "reviewing"
        ).all()
        
        print(f"🕵️ v7.1 Truth Audit: Verifying {len(candidates)} Candidates...")
        
        # Convert to list of dicts for robot
        data_list = []
        for c in candidates:
            # We only need the primary IDs and links
            data_list.append({
                "product_id_1688": c.product_id_1688,
                "amazon_link": c.amazon_link,
                "cost_cny": float(c.cost_cny or 0.0),
                "freight_fee": float(c.freight_fee or 0.0)
            })
            
        # Run Audit (Parallel inside Robot if implemented)
        results = await audit_robot.audit_and_inject(data_list, use_rainforest=True)
        
        # Mark all as 'approved' for now as requested by Boss
        for c in candidates:
            c.status = "approved"
        
        db.commit()
        print(f"✅ Audit Complete. {len(results)} items ready for approval.")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Audit Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_rainforest_audit())
