import shopify
import hashlib
import time
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.models.ledger import AvailableCoupon, UserExt
from app.models.rewards import Points

logger = logging.getLogger(__name__)

class ShopifyAPIError(Exception):
    pass

class ShopifyDiscountService:
    """
    v4.0: Shopify Discount Code and Price Rule Service.
    Implements Balance Payment Bridge and Automated Coupon Issuance logic.
    """
    def __init__(self, db: Session):
        self.db = db
        self.shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
        self.session = shopify.Session(self.shop_url, "2024-01", settings.SHOPIFY_ACCESS_TOKEN)

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ShopifyAPIError)
    )
    def _create_shopify_price_rule_with_retry(self, rule_data: dict) -> shopify.PriceRule:
        """Helper to handle Shopify Leaky Bucket rate limits with tenacity"""
        try:
            price_rule = shopify.PriceRule(rule_data)
            if not price_rule.save():
                raise ShopifyAPIError(f"Failed to create PriceRule: {price_rule.errors.full_messages()}")
            return price_rule
        except Exception as e:
            # Check if it's a rate limit error (HTTP 429)
            if "429" in str(e) or "Too Many Requests" in str(e):
                logger.warning(f"Shopify API rate limit hit. Retrying... Error: {e}")
                raise ShopifyAPIError("Rate limit exceeded")
            # If it's another error, don't retry, just raise it
            raise e

    def deduct_balance_and_generate_voucher(self, user_id: int, email: str, amount_points: int, amount_usd: float) -> str:
        """
        v4.0: Generates a balance voucher WITH pessimistic locking to prevent double-spend.
        """
        try:
            # 1. Pessimistic Lock on User's Points
            points = self.db.query(Points).filter(Points.user_id == user_id).with_for_update().first()
            if not points or points.balance < amount_points:
                logger.error(f"❌ Insufficient balance or user not found. User ID: {user_id}, Balance: {points.balance if points else 0}, Required: {amount_points}")
                return None
                
            # 2. Pre-deduct balance
            points.balance -= amount_points
            self.db.flush() # Flush to lock the row and update DB state without committing yet
            
            # 3. Generate Voucher via Shopify API
            voucher_code = self.generate_balance_voucher(email, amount_usd, user_id)
            
            if not voucher_code:
                # If API fails, rollback the deduction
                self.db.rollback()
                logger.error(f"❌ Rolled back balance deduction for user {user_id} due to Shopify API failure.")
                return None
                
            # 4. Commit the transaction
            self.db.commit()
            return voucher_code
            
        except Exception as e:
            logger.error(f"❌ Error in deduct_balance_and_generate_voucher: {e}")
            self.db.rollback()
            return None

    def generate_balance_voucher(self, email: str, amount: float, shopify_customer_id: int = None) -> str:
        """
        Task 2: Dynamic Discount Generator for Balance Payments.
        Generates a unique, customer-restricted discount code for balance deductions.
        """
        try:
            shopify.ShopifyResource.activate_session(self.session)
            
            if not shopify_customer_id:
                user = self.db.query(UserExt).filter_by(email=email).first()
                shopify_customer_id = user.customer_id if user else None
            
            if not shopify_customer_id:
                logger.info(f"Customer not found in DB for {email}, searching Shopify...")
                customers = shopify.Customer.search(query=f"email:{email}")
                if not customers:
                    logger.error(f"❌ Shopify customer not found for email {email}")
                    return None
                shopify_customer_id = customers[0].id

            # 2. Create Price Rule (with Tenacity retry)
            timestamp = int(time.time())
            rule_title = f"0BUCK-BAL-{email}-{timestamp}"
            
            rule_data = {
                "title": rule_title,
                "target_type": "line_item",
                "target_selection": "all",
                "allocation_method": "across",
                "value_type": "fixed_amount",
                "value": f"-{float(amount):.2f}",
                "customer_selection": "prerequisite",
                "prerequisite_customer_ids": [int(shopify_customer_id)],
                "starts_at": f"{datetime.utcnow().isoformat()}Z",
                "usage_limit": 1
            }
            
            price_rule = self._create_shopify_price_rule_with_retry(rule_data)

            # 3. Create Discount Code
            hash_input = f"{email}-{amount}-{timestamp}"
            code_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:8].upper()
            code_str = f"0BUCK-BAL-{code_hash}"
            
            discount_code = shopify.DiscountCode({
                "price_rule_id": price_rule.id,
                "code": code_str
            })
            
            if not discount_code.save():
                logger.error(f"❌ Failed to create DiscountCode: {discount_code.errors.full_messages()}")
                return None
                
            logger.info(f"✅ Generated Balance Voucher: {code_str}, Amount: ${amount}")
            return code_str

        except Exception as e:
            logger.error(f"❌ Error in generate_balance_voucher: {e}")
            return None
        finally:
            shopify.ShopifyResource.clear_session()

    def claim_coupon_from_pool(self) -> str:
        """
        v4.0: Claims an active coupon from the pre-synchronized pool.
        Marks it as inactive to prevent duplicate claiming.
        """
        try:
            coupon = self.db.query(AvailableCoupon).filter(
                AvailableCoupon.is_active == True
            ).with_for_update().first()
            
            if not coupon:
                logger.warning("⚠️ No active coupons available in the pool.")
                return None
            
            coupon_code = coupon.code
            coupon.is_active = False
            self.db.commit()
            
            logger.info(f"✅ Claimed coupon from pool: {coupon_code}")
            return coupon_code
            
        except Exception as e:
            logger.error(f"❌ Error in claim_coupon_from_pool: {e}")
            self.db.rollback()
            return None
