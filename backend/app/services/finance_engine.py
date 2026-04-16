from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, Optional
import uuid

from app.models.rewards import PointTransaction, AIUsageQuota, Points, PointSource
from app.models.ledger import UserExt, CheckinPlan
from app.services.config_service import ConfigService

# Constants for Points Engine
DAILY_POINT_CAP = 150
RENEWAL_CARD_COST = 3000  # Updated to 3000 as per Master Plan v2.0

def get_reward_rates(db: Session) -> Dict[str, Decimal]:
    """
    v3.4.7 Dynamic Reward Rates from SystemConfig.
    Boss Rule:
    - User Distribution (分销): 3% - 5% (Silver 3.0, Gold 4.0, Platinum 5.0)
    - User Referral/Fan (粉丝): 1.5% - 3.0% (Silver 1.5, Gold 2.0, Platinum 3.0)
    - KOL Distribution: 8% - 20% (Negotiated)
    - KOL Fan: 3% - 8% (Negotiated)
    """
    config = ConfigService(db)
    return {
        "dist_silver": Decimal(str(config.get("dist_silver", 0.03))),
        "dist_gold": Decimal(str(config.get("dist_gold", 0.04))),
        "dist_platinum": Decimal(str(config.get("dist_platinum", 0.05))),
        "fan_silver": Decimal(str(config.get("fan_silver", 0.015))),
        "fan_gold": Decimal(str(config.get("fan_gold", 0.02))),
        "fan_platinum": Decimal(str(config.get("fan_platinum", 0.03))),
        "kol_dist_default": Decimal(str(config.get("kol_dist_default", 0.15))),
        "kol_fan_default": Decimal(str(config.get("kol_fan_default", 0.05))),
    }

def calculate_order_reward(db: Session, order_data: Dict[str, Any], referrer_id: Optional[int] = None) -> Decimal:
    """
    v3.4.7 Final Distribution Logic (Official Priorities):
    1. Direct Referral (分销奖) - 3%-20%. Triggered by specific product/merchant share.
    2. Group Buy (拼团购) - If order is part of a Group Buy campaign, Fan Reward is suppressed.
    3. Fan Reward (粉丝奖) - 1.5%-8%. Triggered by 2Y bond if no Direct Referral.
    
    Priority Rule: Distribution > Group Buy > Fan Reward.
    """
    rates = get_reward_rates(db)
    reward_base = Decimal(str(order_data.get("reward_base") or order_data.get("total_price", 0)))
    customer_id = order_data.get("customer_id")
    order_id = order_data.get("order_id")
    
    # 1. Direct Referral (Highest Priority)
    if referrer_id:
        referrer = db.query(UserExt).filter(UserExt.customer_id == referrer_id).first()
        if referrer:
            if referrer.user_type == "kol":
                # KOL: Use negotiated rate if set, else default 15%
                rate = referrer.dist_rate if referrer.dist_rate is not None else rates["kol_dist_default"]
                return reward_base * rate
            else:
                # User: Tiered (3.0% Silver, 4.0% Gold, 5.0% Platinum)
                if referrer.dist_rate is not None:
                    return reward_base * referrer.dist_rate
                
                if referrer.user_tier == "platinum": return reward_base * rates["dist_platinum"]
                elif referrer.user_tier == "gold": return reward_base * rates["dist_gold"]
                else: return reward_base * rates["dist_silver"]

    # 2. Group Buy Suppression (Check if this order is an invitee in a Group Buy)
    # If the order was triggered by a Group Buy share code, it was handled by join_group_buy.
    # We should NOT pay a fan reward to the inviter if it's a group buy order.
    from app.models.ledger import GroupBuyCampaign
    # We check if this specific order was triggered by a Group Buy code.
    # (This information needs to be passed in order_data or derived from webhooks)
    if order_data.get("is_group_buy_invitee"):
        print(f"Order {order_id} is a Group Buy invitee. Suppressing Fan Reward.")
        return Decimal('0.0')
            
    # 3. Fan Reward (Triggered by 2-year LTV bond)
    user = db.query(UserExt).filter(UserExt.customer_id == customer_id).first()
    if user and user.inviter_id:
        inviter = db.query(UserExt).filter(UserExt.customer_id == user.inviter_id).first()
        if inviter:
            # Check 2-year lock (730 days)
            days_since_reg = (datetime.now() - user.created_at).days
            if days_since_reg <= 730:
                if inviter.user_type == "kol":
                    # KOL Fan: Use negotiated rate if set, else default 5%
                    rate = inviter.fan_rate if inviter.fan_rate is not None else rates["kol_fan_default"]
                    return reward_base * rate
                else:
                    # User Fan: Tiered (1.5% Silver, 2.0% Gold, 3.0% Platinum)
                    if inviter.fan_rate is not None:
                        return reward_base * inviter.fan_rate
                        
                    if inviter.user_tier == "platinum": return reward_base * rates["fan_platinum"]
                    elif inviter.user_tier == "gold": return reward_base * rates["fan_gold"]
                    else: return reward_base * rates["fan_silver"]

    return Decimal('0.0')

    return Decimal('0.0')

    return Decimal('0.0')

def earn_points(db: Session, user_id: int, source: PointSource, amount: int) -> bool:
    """
    Earn points with a daily cap of 150 Pts for non-transactional tasks.
    Transactional source (PURCHASE) is exempt from the daily cap.
    """
    # Non-transactional sources are subject to the daily cap
    is_transactional = (source in {PointSource.PURCHASE, PointSource.REFERRAL})
    
    if not is_transactional:
        today = date.today()
        # Aggregate today's non-transactional point earnings
        # v3.4.7: Sum all non-transactional sources (SIGN_IN, AD, etc.)
        non_transactional_sources = [
            PointSource.SIGN_IN, 
            PointSource.AD_WATCH, 
            PointSource.SOCIAL_POST,
            PointSource.FEEDBACK
        ]
        
        today_earned = db.query(func.sum(PointTransaction.amount)).filter(
            PointTransaction.user_id == user_id,
            PointTransaction.source.in_(non_transactional_sources),
            PointTransaction.amount > 0,
            func.date(PointTransaction.created_at) == today
        ).scalar() or 0
        
        if today_earned >= DAILY_POINT_CAP:
            return False # Cap already reached
            
        # Adjust amount to stay within cap if necessary
        if today_earned + amount > DAILY_POINT_CAP:
            amount = DAILY_POINT_CAP - today_earned
    else:
        # Transactional points (Self purchase * 5, Fan purchase * 2)
        # Requirement: Handled by caller to ensure "Effective Order" status (Delivered + 15D)
        pass

    if amount <= 0:
        return False

    # Thread-safe balance update using row-level locking
    points_record = db.query(Points).filter(Points.user_id == user_id).with_for_update().first()
    if not points_record:
        points_record = Points(user_id=user_id, balance=0, total_earned=0)
        db.add(points_record)
    
    points_record.balance += amount
    points_record.total_earned += amount
    
    # Log the point transaction
    txn = PointTransaction(
        user_id=user_id,
        amount=amount,
        source=source
    )
    db.add(txn)
    db.commit()
    return True

def calculate_final_price(
    cost_cny: float, 
    exchange_rate: float, 
    multiplier: float = 2.0,
    comp_price_usd: Optional[float] = None,
    sale_price_ratio: Optional[float] = None,
    compare_at_price_ratio: Optional[float] = None,
    shipping_cost_usd: float = 0.0,
    is_magnet: bool = False
) -> dict:
    """
    v5.3 Freight-Aware Pricing Logic (Hybrid Strategy):
    1. Base: Cost * Multiplier (Fallback)
    2. Dynamic: Comp Price * sale_price_ratio (Preferred)
    3. Strikethrough: Comp Price * compare_at_price_ratio
    4. Safety: Price must cover (Product Cost + Shipping Cost) * 1.2
    
    v8.5 MAGNET Update: If is_magnet is True, final_price_usd = 0.0
    STRICT: Uses Decimal for all currency calculations.
    """
    cost_cny_dec = Decimal(str(cost_cny))
    rate_dec = Decimal(str(exchange_rate))
    shipping_dec = Decimal(str(shipping_cost_usd))
    
    # Phase 1: CNY -> USD with 0.5% Hedge Buffer
    hedge_buffer = Decimal("1.005")
    cost_usd = (cost_cny_dec * hedge_buffer) * rate_dec
    total_landed_cost = cost_usd + shipping_dec
    
    # Phase 2: Final Sale Price Calculation
    if is_magnet:
        # v8.5 MAGNET: Product Price is always $0.00
        final_price_usd = Decimal("0.0")
        
        # v8.5 Patch: 10% Logistics Buffer for Shipping
        # We ensure the shipping charged to user covers total_landed_cost + 10% safety margin.
        # But wait, final_price_usd is just the product price. 
        # Shipping is handled separately in Shopify. 
        # However, for Audit/Selection purposes, we must check if Shipping > Total_Landed_Cost * 1.1
    elif comp_price_usd and sale_price_ratio:
        # Use Competitor-based pricing (60% rule)
        comp_dec = Decimal(str(comp_price_usd))
        ratio_dec = Decimal(str(sale_price_ratio))
        final_price_usd = comp_dec * ratio_dec
        
        # Safety check: v6.2.0 Truth Engine Floor: 1.5x Landed Cost
        min_margin = Decimal("1.5")
        if final_price_usd < total_landed_cost * min_margin:
            final_price_usd = total_landed_cost * min_margin
    else:
        # Fallback to Multiplier-based pricing
        mult_dec = Decimal(str(multiplier))
        final_price_usd = total_landed_cost * mult_dec

    # Phase 3: Compare At Price (Strikethrough)
    if comp_price_usd and compare_at_price_ratio:
        comp_dec = Decimal(str(comp_price_usd))
        strike_ratio = Decimal(str(compare_at_price_ratio))
        compare_at_price = comp_dec * strike_ratio
    elif comp_price_usd:
        # v5.2 Strict: No fabrication. Use the original competition price if no ratio given.
        compare_at_price = Decimal(str(comp_price_usd))
    else:
        # Fallback: Just use the sale price (No strikethrough effect)
        compare_at_price = final_price_usd
    
    # v7.0: Shipping Ratio Warning (Critical for conversion)
    shipping_ratio = Decimal("0.0")
    shipping_warning = False
    if final_price_usd > 0:
        shipping_ratio = shipping_dec / final_price_usd
        if shipping_ratio > Decimal("0.4"):
            shipping_warning = True

    # v8.5 selection threshold: (Amazon Sale Price * 60%) / alibaba_item_cost (without shipping)
    selection_threshold = Decimal("0.0")
    if cost_usd > 0 and comp_price_usd:
        comp_dec = Decimal(str(comp_price_usd))
        ratio_dec = Decimal(str(sale_price_ratio or 0.6))
        selection_threshold = (comp_dec * ratio_dec) / cost_usd

    # v8.5 Patch: MAGNET Safety Audit (Amazon Shipping * 0.9 vs Landed Cost)
    magnet_safety_passed = True
    if is_magnet:
        # Assuming amazon_standalone_shipping is around $6.99 (Boss's anchor)
        amazon_shipping_anchor = Decimal("6.99") 
        # Safety: (Amazon Shipping * 0.9) must cover Total Landed Cost
        # v8.5.1 Logistics Patch: Shipping fee we charge to user
        final_shipping_fee = amazon_shipping_anchor * Decimal("0.9")
        if final_shipping_fee < total_landed_cost:
            magnet_safety_passed = False

    return {
        "source_cost_usd": float(cost_usd.quantize(Decimal("0.01"))),
        "shipping_cost_usd": float(shipping_dec.quantize(Decimal("0.01"))),
        "total_landed_cost": float(total_landed_cost.quantize(Decimal("0.01"))),
        "final_price_usd": float(final_price_usd.quantize(Decimal("0.01"))),
        "compare_at_price": float(compare_at_price.quantize(Decimal("0.01"))),
        "profit_usd": float((final_price_usd - total_landed_cost).quantize(Decimal("0.01"))),
        "roi": float((final_price_usd / total_landed_cost).quantize(Decimal("0.01"))) if total_landed_cost > 0 else 0.0,
        "selection_threshold": float(selection_threshold.quantize(Decimal("0.01"))),
        "is_reward_eligible": selection_threshold >= Decimal("4.0"),
        "magnet_safety_passed": magnet_safety_passed,
        "shipping_ratio": float(shipping_ratio.quantize(Decimal("0.001"))),
        "shipping_warning": shipping_warning
    }

class FinanceEngine:
    def __init__(self, db: Session):
        self.db = db

    def calculate_order_reward(self, order_data: Dict[str, Any], referrer_id: Optional[int] = None, kol_negotiated_rate: Optional[float] = None) -> Decimal:
        return calculate_order_reward(self.db, order_data, referrer_id=referrer_id)

    def earn_points(self, user_id: int, source: PointSource, amount: int) -> bool:
        return earn_points(self.db, user_id, source, amount)

    def redeem_renewal_card(self, user_id: int, order_id: str, phase_id: int) -> (bool, str):
        from app.services.rewards import RewardsService
        rewards = RewardsService(self.db)
        from app.models.ledger import CheckinPlan
        # Try finding by order_id (casted to int)
        try:
            order_id_int = int(order_id)
            plan = self.db.query(CheckinPlan).filter_by(order_id=order_id_int, user_id=user_id).first()
        except:
            plan = None
            
        if not plan:
            return False, "Check-in plan not found for this order."
            
        res = rewards.redeem_renewal_card(user_id, str(plan.id))
        if res["status"] == "success":
            return True, res["message"]
        else:
            return False, res["message"]

    def handle_paid_order(self, payload: Dict[str, Any]):
        """
        v4.0: Handle Shopify orders/paid.
        1. Create local Order record.
        2. Calculate Rewards & Points.
        3. Trigger Cashback Plan if eligible.
        """
        from app.models.ledger import Order
        shopify_order_id = str(payload.get("id"))
        order_number = payload.get("order_number")
        customer = payload.get("customer", {})
        total_price = payload.get("total_price")

        # 1. Create Local Order
        existing = self.db.query(Order).filter_by(shopify_order_id=shopify_order_id).first()
        if not existing:
            new_order = Order(
                shopify_order_id=shopify_order_id,
                order_number=order_number,
                user_id=customer.get("id"),
                total_price=float(total_price or 0),
                status="paid",
                created_at=datetime.now()
            )
            self.db.add(new_order)
            self.db.commit()
            print(f"✅ Local Order Created: {order_number}")
        
        # 2. Rewards (Placeholder for v6.2.0)
        # TODO: Implement full reward calculation based on 20-Phase rules
        pass
