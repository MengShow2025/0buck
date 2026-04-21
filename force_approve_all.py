from app.db.session import SessionLocal
from app.services.supply_chain import SupplyChainService
from app.models.product import CandidateProduct
import asyncio

async def approve_all():
    db = SessionLocal()
    sc = SupplyChainService(db)
    cands = db.query(CandidateProduct).filter(CandidateProduct.status != 'synced').all()
    for c in cands:
        print(f"Approving {c.id}")
        try:
            await sc.approve_candidate(c.id)
            print(f"Approved {c.id}")
        except Exception as e:
            print(f"Failed {c.id}: {e}")

asyncio.run(approve_all())
