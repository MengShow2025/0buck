import asyncio
from sqlalchemy.orm import Session
from backend.app.db.session import SessionLocal
from backend.app.services.rewards import RewardsService
from backend.app.services.sync_1688 import Sync1688Service

async def test_logic():
    db = SessionLocal()
    try:
        # 1. Setup Test Data
        customer_id = 12345
        order_id = 99999
        reward_base = 64.50
        timezone = "Asia/Shanghai"
        
        line_items = [
            {
                "id": 1,
                "product_id": 14115444261167,
                "title": "[0Buck] 0Buck Crystal Glow Bluetooth Speaker - HiFi Deep Bass",
                "sku": "",
                "quantity": 1,
                "price": "74.50"
            }
        ]

        print(f"--- Testing Logic for Order {order_id} ---")
        
        # 2. Test Rewards Service
        print("\nStep 1: Initializing Rewards/Checkin Plan...")
        rewards_service = RewardsService(db)
        rewards_service.init_checkin_plan(customer_id, order_id, reward_base, timezone)
        print("  Rewards plan initialized.")

        # 3. Test Sourcing Service
        print("\nStep 2: Triggering 1688 Sourcing...")
        sourcing_service = Sync1688Service(db)
        procurement_orders = await sourcing_service.trigger_sourcing(order_id, line_items)
        
        print("\n--- Summary ---")
        print(f"Procurement Orders: {procurement_orders}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_logic())
