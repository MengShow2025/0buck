import os
import sys
from decimal import Decimal
from sqlalchemy.orm import Session
from backend.app.db.session import SessionLocal
from backend.app.services.rewards import RewardsService
from backend.app.models.rewards import Wallet

# Ensure backend is in the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

def issue_reward(customer_id: int, amount: float):
    db = SessionLocal()
    try:
        service = RewardsService(db)
        print(f"--- Issuing sign-in reward for customer {customer_id} ---")
        
        # 1. Update local wallet
        service.update_wallet_balance(
            customer_id=customer_id,
            amount=Decimal(str(amount)),
            type='checkin',
            description="Initial sign-in reward (First real reward!)"
        )
        print(f"   [LOCAL SUCCESS] Wallet updated by ${amount}")
        
        # 2. Sync to Shopify
        success = service.sync_customer_data_to_shopify(customer_id)
        if success:
            print(f"   [SHOPIFY SUCCESS] Synced balance to Shopify Metafields.")
        else:
            print(f"   [SHOPIFY FAILED] Could not sync to Shopify.")
            
    except Exception as e:
        print(f"   [ERROR]: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Test User ID from previous Shopify fetch
    TEST_CUSTOMER_ID = 9845230895407
    issue_reward(TEST_CUSTOMER_ID, 0.60)
