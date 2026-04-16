import shopify
import random
import string
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.ledger import Order

logger = logging.getLogger(__name__)

class ShopifyDiscountService:
    """
    v4.0: Headless Payment Bridge.
    Generates dynamic Shopify Discount Codes to facilitate 'Balance Payments'.
    """
    def __init__(self, db: Session):
        self.db = db
        self.shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
        self.session = shopify.Session(self.shop_url, "2024-01", settings.SHOPIFY_ACCESS_TOKEN)
        shopify.ShopifyResource.activate_session(self.session)

    def generate_balance_voucher(self, customer_email: str, amount: float, customer_id: int = None) -> str:
        """
        v4.0 Phase 1 Task 2:
        1. Create a PriceRule in Shopify for the specific customer.
        2. Generate a unique code linked to that rule.
        3. Return the code.
        """
        try:
            # 1. Generate Unique Code (Step 3 of Task 2)
            suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            discount_code = f"0B-BAL-{suffix}"
            
            # 2. Create Price Rule (Step 2 of Task 2)
            # Logic: Fixed amount off, applies to all items, restricted to this customer
            price_rule = shopify.PriceRule.create({
                "title": f"Balance Payment for {customer_email}",
                "target_type": "line_item",
                "target_selection": "all",
                "allocation_method": "across",
                "value_type": "fixed_amount",
                "value": f"-{amount}", # Shopify expects negative value for discount
                "customer_selection": "prerequisite",
                "prerequisite_customer_ids": [customer_id] if customer_id else [],
                "once_per_customer": True,
                "usage_limit": 1,
                "starts_at": datetime.now().isoformat(),
                "ends_at": (datetime.now() + timedelta(hours=24)).isoformat() # 24h validity
            })
            
            if not price_rule.errors.errors:
                # 3. Create Discount Code linked to Price Rule
                code_obj = shopify.DiscountCode.create({
                    "price_rule_id": price_rule.id,
                    "code": discount_code
                })
                
                if not code_obj.errors.errors:
                    logger.info(f"✨ Balance Voucher Generated: {discount_code} for {amount} USD")
                    return discount_code
                else:
                    logger.error(f"❌ Failed to create Discount Code: {code_obj.errors.full_messages()}")
            else:
                logger.error(f"❌ Failed to create Price Rule: {price_rule.errors.full_messages()}")
            
            return None

        except Exception as e:
            logger.error(f"🚨 Shopify Discount Error: {str(e)}")
            return None
        finally:
            shopify.ShopifyResource.clear_session()

    def cleanup_expired_vouchers(self):
        """v4.0: Housekeeping to remove unused price rules."""
        # TODO: Implement automated cleanup of expired rules to keep Shopify API clean
        pass
