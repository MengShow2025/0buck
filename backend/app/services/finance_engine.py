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

def calculate_final_price(cost_cny: float, exchange_rate: float, multiplier: float) -> dict:
    """
    v3.4.7 Pricing Logic (3-Phase Firewall):
    1. CNY -> USD (Buffer 0.5% applied at ingestion)
    2. USD -> Local (Real-time conversion for display)
    3. Local -> USD (Re-calculate for final payment settlement)
    
    STRICT: Uses Decimal for all currency calculations.
    """
    cost_cny_dec = Decimal(str(cost_cny))
    rate_dec = Decimal(str(exchange_rate))
    mult_dec = Decimal(str(multiplier))
    
    # Phase 1: CNY -> USD with 0.5% Hedge Buffer
    hedge_buffer = Decimal("1.005")
    cost_usd = (cost_cny_dec * hedge_buffer) / rate_dec
    
    # Phase 2: Apply multiplier (e.g. 1.6x - 4x) for final sale price
    final_price_usd = cost_usd * mult_dec
    
    return {
        "source_cost_usd": float(cost_usd.quantize(Decimal("0.01"))),
        "final_price_usd": float(final_price_usd.quantize(Decimal("0.01")))
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
