import os
import sys
import asyncio
from sqlalchemy.orm import Session

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from app.db.session import SessionLocal
from app.services.industrial_batch_factory import IndustrialBatchFactory

async def run_daily_robot():
    """
    v7.1 Daily Robot: Monitoring & Melting (High Frequency).
    Target: Run every 30-60 minutes.
    """
    print("🤖 v7.1 Daily Robot: Starting High-Frequency Radar...")
    db = SessionLocal()
    try:
        factory = IndustrialBatchFactory(db)
        # 1. High-Freq Monitor (Price & Inventory)
        await factory.run_high_freq_monitor()
        print("✅ Radar Scan Complete.")
    except Exception as e:
        print(f"❌ Daily Robot Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_daily_robot())
