import logging
import asyncio
from decimal import Decimal
from app.core.celery_app import celery_app
from app.core.celery_instrumentation import InstrumentedTask
from app.db.session import SessionLocal
from app.services.rewards import RewardsService
from app.services.supply_chain import SupplyChainService
from app.services.social_automation import SocialAutomationService
from app.models.ledger import Order, SystemConfig, OrderAttribution, UserExt
from app.models.product import Product
from app.services.promo_cards import resolve_share_link

logger = logging.getLogger(__name__)

@celery_app.task(name="app.workers.shopify_tasks.process_paid_order", bind=True, base=InstrumentedTask, max_retries=3)
def process_paid_order(self, payload: dict):
    """
    Process paid Shopify orders asynchronously.
    Initializes 500-day check-in plan, referral commissions, and supply chain fulfillment.
    """
    db = SessionLocal()
    try:
        customer = payload.get("customer") or {}
        customer_id = customer.get("id")
        order_id = payload.get("id")
        order_number = payload.get("name") or str(order_id)
        total_price = payload.get("current_total_price") or payload.get("total_price") or "0"
        
        if not customer_id or not order_id:
            logger.warning(f"Task skipped: missing IDs for order {order_id}")
            return {"status": "skipped"}

        # 1. Idempotency Check
        local_order = db.query(Order).filter_by(shopify_order_id=order_id).first()
        if not local_order:
            local_order = Order(
                shopify_order_id=order_id,
                user_id=customer_id,
                order_number=order_number,
                total_price=Decimal(str(total_price)),
                status="paid"
            )
            db.add(local_order)
        elif local_order.status == "paid_processed":
            logger.info(f"Order {order_id} already processed.")
            return {"status": "already_processed"}
        
        db.commit()

        # 2. Reward Base Calculation
        excluded_config = db.query(SystemConfig).filter_by(key="excluded_reward_categories").first()
        excluded_categories = set(excluded_config.value) if excluded_config else set()
        
        reward_base = Decimal('0.0')
        for item in payload.get("line_items", []):
            variant_id = str(item.get("variant_id"))
            quantity = item.get("quantity", 1)
            price = Decimal(str(item.get("price", "0")))
            
            # Check eligibility
            product = db.query(Product).filter(Product.shopify_variant_id == variant_id).first()
            if product and (product.category in excluded_categories or not getattr(product, 'is_reward_eligible', True)):
                continue
            reward_base += price * Decimal(str(quantity))

        # 3. Process Balance Deduction & Rewards
        rewards_service = RewardsService(db, current_user_id=1)
        
        note_attrs = payload.get("note_attributes", [])
        balance_deducted = next((Decimal(str(a["value"])) for a in note_attrs if a["name"] == "balance_deducted"), Decimal("0"))
        if balance_deducted > 0:
            rewards_service.finalize_payment(customer_id, balance_deducted, str(order_id))

        if reward_base > 0:
            rewards_service.init_checkin_plan(customer_id, order_id, reward_base, customer.get("timezone", "UTC"))
            
        referral_code = next((a["value"] for a in note_attrs if a["name"] == "referral_code"), None)
        share_token = next((a["value"] for a in note_attrs if a["name"] == "share_token"), None)

        if share_token:
            share_row = resolve_share_link(db, share_token)
            if share_row and not db.query(OrderAttribution).filter_by(order_id=order_id).first():
                db.add(OrderAttribution(
                    order_id=order_id,
                    share_token=share_row.share_token,
                    sharer_user_id=share_row.sharer_user_id,
                    share_category=share_row.share_category,
                    card_type=share_row.card_type,
                    target_type=share_row.target_type,
                    target_id=share_row.target_id,
                    entry_type=share_row.entry_type,
                    policy_version=share_row.policy_version,
                ))
                # Bridge existing rewards pipeline without changing payout priority logic.
                if not referral_code:
                    referral_code = share_row.source_code
                    if not referral_code:
                        sharer = db.query(UserExt).filter_by(customer_id=share_row.sharer_user_id).first()
                        referral_code = getattr(sharer, "referral_code", None)
                db.commit()

        if referral_code:
            rewards_service.record_referral(customer_id, referral_code)
            rewards_service.process_referral_commissions(customer_id, order_id, reward_base, referral_code)

        # 4. Async Side-effects (Sourcing & Social Notification)
        # Assuming SupplyChainService and SocialAutomationService have async methods, we can run them in an event loop
        loop = asyncio.get_event_loop()
        
        sourcing_service = SupplyChainService(db)
        # Safe handling of SupplyChainService async call
        try:
            loop.run_until_complete(sourcing_service.trigger_sourcing(order_id, payload.get("line_items", []), auto_fulfill=True))
        except Exception as e:
            logger.error(f"Sourcing trigger error: {e}")

        try:
            social_service = SocialAutomationService(db)
            loop.run_until_complete(social_service.notify_order_paid(order_id))
        except Exception as e:
            logger.error(f"Social notification error: {e}")

        # Mark as fully processed
        local_order.status = "paid_processed"
        db.commit()

        return {"status": "success", "order_id": order_id}

    except Exception as e:
        err = str(e)
        # Local DB schema may be ahead/behind model fields in some environments.
        # For known missing-column cases, skip retry to avoid webhook retry storms.
        if "column orders.referrer_id does not exist" in err:
            logger.error("process_paid_order skipped due to schema mismatch: %s", err)
            db.rollback()
            return {"status": "skipped_schema_mismatch", "order_id": order_id}

        logger.error(f"Error in process_paid_order task: {err}")
        db.rollback()
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
    finally:
        db.close()
