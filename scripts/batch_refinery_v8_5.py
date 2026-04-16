import asyncio
import os
from sqlalchemy import text
from app.db.session import SessionLocal
from app.services.supply_chain import SupplyChainService

async def batch_sync_refined():
    db = SessionLocal()
    sc = SupplyChainService(db)
    
    # Get all Alibaba test products
    pids = db.execute(text("SELECT product_id_1688 FROM candidate_products WHERE source_platform = 'ALIBABA'")).fetchall()
    
    print(f"🚀 Batch Refinery: Processing {len(pids)} products...")
    
    for pid in pids:
        pid_val = pid[0]
        print(f"   ⚙️ Refining: {pid_val}")
        try:
            # This triggers sync_product -> RefineryGateway -> DB Update
            await sc.sync_product(pid_val, strategy_tag="ALIBABA")
        except Exception as e:
            print(f"   ❌ Failed to refine {pid_val}: {e}")
            
    db.close()
    print("✅ Batch Refinery Complete.")

if __name__ == "__main__":
    asyncio.run(batch_sync_refined())
