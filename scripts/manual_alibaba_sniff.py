import asyncio
import logging
import sys
import os
import json

# Ensure project root is in sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_root = os.path.join(project_root, 'backend')
if backend_root not in sys.path:
    sys.path.append(backend_root)

from app.db.session import SessionLocal
from app.services.supply_chain import SupplyChainService
from app.models.product import CandidateProduct

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_sniff():
    db = SessionLocal()
    try:
        from app.services.config_service import ConfigService
        config = ConfigService(db)
        config.set("min_trend_score", 0, description="Test Override")
        db.commit()

        sc_service = SupplyChainService(db)
        
        # 1. Fetch 'new' candidates that haven't been checked
        candidates = db.query(CandidateProduct).filter(
            CandidateProduct.status == "new",
            CandidateProduct.alibaba_comparison_price == None
        ).all()
        
        print(f"Found {len(candidates)} 'new' candidates with alibaba_comparison_price == None.")
        
        if not candidates:
            print("No 'new' candidates for verification. (Testing with first ID if available...)")
            candidates = db.query(CandidateProduct).limit(1).all()

        for c in candidates:
            print(f"🧪 Testing Arbitrage Sniff for Candidate: {c.title_zh[:30]} (ID: {c.id})")
            await sc_service.find_alibaba_alternative(c.id)
            
            # Re-fetch from DB to verify
            db.refresh(c)
            if c.discovery_evidence and c.discovery_evidence.get("arbitrage_recommend"):
                print(f"✅ SUCCESS: Candidate {c.id} marked as ARBITRAGE RECOMMENDED!")
                print(f"💰 Alibaba Price: {c.alibaba_comparison_price} USD | 1688 Cost: {c.cost_cny} CNY")
            else:
                print(f"ℹ️ Info: Candidate {c.id} does not meet arbitrage criteria (Normal Behavior).")
                print(f"🔍 Result: alibaba_comparison_price={c.alibaba_comparison_price}")
                
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_sniff())
