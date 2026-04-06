import asyncio
import logging
import os
import sys

# Add the parent directory to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from app.services.smart_business import SmartBusinessService
from app.services.supply_chain import SupplyChainService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_scanner():
    """
    v3.9.1: Global Smart Business & Sourcing Scanner.
    Runs every 6 hours.
    1. Smart Business: Price Radar, Churn, Abandoned Drafts.
    2. Sourcing: IDS Sniffing (Following) & Spying (Spy Mode) -> Candidate Pool.
    """
    logger.info("🚀 Starting 6-hour Global Scanner...")
    db = SessionLocal()
    try:
        # 1. Smart Business Logic
        business_service = SmartBusinessService(db)
        await business_service.scan_all()
        
        # 2. Sourcing Logic (v3.9.1: Autonomous Pipeline)
        sc_service = SupplyChainService(db)
        logger.info("  🕵️ Running IDS Sniffing (Following Mode)...")
        await sc_service.ids_sniffing_and_populate()
        
        logger.info("  🕵️ Running Spy Monitor (Spy Mode)...")
        await sc_service.spying_engine_and_populate()

        logger.info("✅ Global Scanner completed successfully.")
    except Exception as e:
        logger.error(f"❌ Error during Global Scan: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # If using an async loop from another process, we use asyncio.run
    asyncio.run(run_scanner())
