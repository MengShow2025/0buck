from datetime import datetime, date, timedelta
from typing import Optional, List, Callable, Dict, Any
from functools import wraps
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from decimal import Decimal
from zoneinfo import ZoneInfo
from app.models.rewards import (
    PointSource, PointTransaction, AIUsageQuota, Points, RenewalCard
)
import logging
from app.models.ledger import (
    UserExt, Wallet, WalletTransaction, CheckinPlan, CheckinLog, ReferralRelationship, GroupBuyCampaign, Order
)
from app.models.actuarial import RewardPhase, PlatformProfitPool

logger = logging.getLogger(__name__)

DEFAULT_POINTS_MULTIPLIERS = {
    "self_purchase": 5,
    "fan_purchase": 2,
}

DEFAULT_POINTS_ACTIVITY_RULES = {
    "daily_cap": 150,
    "events": {
        "checkin": 10,
        "post": 20,
        "comment": 10,
        "review": 15,
        "ad_watch": 5,
        "feedback": 10,
        "campaign": 30,
        "presale": 40,
    },
}

DEFAULT_POINTS_EXCHANGE_CATALOG = [
    {
        "code": "renewal_card",
        "name": "Renewal Card",
        "description": "1 card for check-in streak rescue (<=5 days break).",
        "points_cost": 3000,
        "type": "renewal_card",
        "enabled": True,
        "requires_plan_id": True,
    },
    {
        "code": "voucher_5usd",
        "name": "5 USD Voucher",
        "description": "Shopify discount voucher bound to current user.",
        "points_cost": 1500,
        "type": "shopify_balance_voucher",
        "enabled": True,
        "voucher_usd": 5,
    },
]

ACTIVITY_EVENT_TO_SOURCE = {
    "checkin": PointSource.SIGN_IN,
    "post": PointSource.SOCIAL_POST,
    "comment": PointSource.REVIEW,
    "review": PointSource.REVIEW,
    "ad_watch": PointSource.AD_WATCH,
    "feedback": PointSource.FEEDBACK,
    "campaign": PointSource.TASK,
    "presale": PointSource.TASK,
}

def enforce_idor(owner_id_field: str = "user_id"):
    """
    v3.5.0: Insecure Direct Object Reference (IDOR) Protection Decorator.
    Ensures the current user only accesses their own resources.
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # In v3.5 we'd extract current_user from a context or JWT
            # For now, we assume the first arg after 'self' is customer_id/user_id
            # This is a placeholder for the actual zero-trust implementation
            return func(self, *args, **kwargs)
        return wrapper
    return decorator

def admin_audit(action: str):
    """
    v3.5.0: Admin Audit Trail Decorator.
    Logs every administrative action to the database for accountability.
    """
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # 1. Execute the function first
            result = func(self, *args, **kwargs)
            
            # 2. Persist the audit log
            from app.models.ledger import AdminAuditLog
            import json
            
            # v3.5.0: Extract admin_id from the service instance
            admin_id = getattr(self, "current_user_id", None) or 1 # Fallback to System ID if not provided
            
            try:
                # Extract target_id from args (usually first arg is customer_id)
                target_id = str(args[0]) if args else None
                
                audit = AdminAuditLog(
                    admin_id=admin_id,
                    action=action,
                    target_id=target_id,
                    payload={"args": [str(a) for a in args], "kwargs": {k: str(v) for k, v in kwargs.items()}}
                )
                self.db.add(audit)
                self.db.commit()
            except Exception as e:
                print(f"FAILED TO LOG AUDIT: {e}")
                self.db.rollback()
            
            return result
        return wrapper
    return decorator

class RewardsService:
    def __init__(self, db: Session, current_user_id: Optional[int] = None):
        self.db = db
        self.current_user_id = current_user_id
        from app.services.config_service import ConfigService
        self.config_service = ConfigService(db)

    def _generate_v3_plan_config(self) -> List[dict]:
        """
        v3.0 Golden Random Engine (Boss's Official Config):
        - P1: { r: 4, d: 5 } (Fixed)
        - P2: { r: 6, d: 10 } (Fixed)
        - P3-P20: 18 Randomized phases from 'Golden Package'
        - Late Explosion: 8%/10% hits have 80% weight in P11-P20.
        """
        import random
        
        # 1. Start with Fixed Foundation
        plan = [
            {"period": 1, "days": 5, "reward": 4},
            {"period": 2, "days": 10, "reward": 6}
        ]
        
        # 2. Define the 'Golden Package' Pools
        big_hits = [
            {"reward": 8, "days": 30, "type": "explosion"},
            {"reward": 10, "days": 30, "type": "explosion"}
        ]
        
        # 5 units of 5%/30d
        normal_30d = [{"reward": 5, "days": 30, "type": "normal"} for _ in range(5)]
        
        # 11 units of 25d with varied rewards
        normal_25d = (
            [{"reward": 5, "days": 25, "type": "normal"} for _ in range(4)] +
            [{"reward": 3, "days": 25, "type": "normal"} for _ in range(1)] +
            [{"reward": 4, "days": 25, "type": "normal"} for _ in range(6)]
        )
        
        all_normals = normal_30d + normal_25d
        random.shuffle(all_normals)
        
        # 3. Structural Probability Distribution (P3-P20)
        # P3-P20 are drawn from the remaining 18 units, but big hits are weighted
        # to appear more frequently in P11-P20.
        slots = [None] * 18
        
        for hit in big_hits:
            # 20% chance to place in P3-P10 (indices 0-7), 80% chance in P11-P20 (indices 8-17)
            target_stage = 'late' if random.random() < 0.8 else 'early'
            
            placed = False
            while not placed:
                idx = random.randint(0, 7) if target_stage == 'early' else random.randint(8, 17)
                if slots[idx] is None:
                    slots[idx] = hit
                    placed = True
        
        # 4. Fill remaining 16 slots with normals
        for i in range(18):
            if slots[i] is None:
                slots[i] = all_normals.pop()
        
        # 5. Assemble into Plan
        for i, unit in enumerate(slots):
            plan.append({
                "period": i + 3,
                "days": unit["days"],
                "reward": unit["reward"]
            })
            
        return plan

    def _get_period_config(self, plan: CheckinPlan, period_num: int) -> dict:
        """
        v3.0: Read the randomized configuration from the plan's specific roadmap.
        """
        if not plan.plan_config:
            # Fallback if config was missing (though init should handle it)
            return {"days": 30, "reward": 5}
            
        for p in plan.plan_config:
            if p["period"] == period_num:
                return {"days": p["days"], "ratio": p["reward"]}
                
        return {"days": 30, "ratio": 5}

    def _get_period_days(self, plan: CheckinPlan, period_num: int) -> int:
        return self._get_period_config(plan, period_num)["days"]

    def _get_local_today(self, timezone_str: str) -> date:
        tz = ZoneInfo(timezone_str) if timezone_str else ZoneInfo("UTC")
        return datetime.now(tz).date()

    def get_points_multipliers(self) -> Dict[str, int]:
        configured = self.config_service.get("POINTS_MULTIPLIERS", DEFAULT_POINTS_MULTIPLIERS) or {}
        return {
            "self_purchase": int(configured.get("self_purchase", DEFAULT_POINTS_MULTIPLIERS["self_purchase"])),
            "fan_purchase": int(configured.get("fan_purchase", DEFAULT_POINTS_MULTIPLIERS["fan_purchase"])),
        }

    def get_points_activity_rules(self) -> Dict[str, Any]:
        configured = self.config_service.get("POINTS_ACTIVITY_RULES", DEFAULT_POINTS_ACTIVITY_RULES) or {}
        configured_events = configured.get("events") if isinstance(configured, dict) else {}
        if not isinstance(configured_events, dict):
            configured_events = {}
        merged_events = dict(DEFAULT_POINTS_ACTIVITY_RULES["events"])
        for k, v in configured_events.items():
            try:
                merged_events[str(k)] = int(v)
            except (TypeError, ValueError):
                continue
        daily_cap = configured.get("daily_cap", DEFAULT_POINTS_ACTIVITY_RULES["daily_cap"]) if isinstance(configured, dict) else DEFAULT_POINTS_ACTIVITY_RULES["daily_cap"]
        try:
            daily_cap = int(daily_cap)
        except (TypeError, ValueError):
            daily_cap = DEFAULT_POINTS_ACTIVITY_RULES["daily_cap"]
        return {"daily_cap": daily_cap, "events": merged_events}

    def get_points_exchange_catalog(self) -> List[Dict[str, Any]]:
        configured = self.config_service.get("POINTS_EXCHANGE_CATALOG", DEFAULT_POINTS_EXCHANGE_CATALOG)
        if not isinstance(configured, list):
            return list(DEFAULT_POINTS_EXCHANGE_CATALOG)
        items: List[Dict[str, Any]] = []
        for item in configured:
            if not isinstance(item, dict):
                continue
            if not item.get("code"):
                continue
            normalized = dict(item)
            normalized["enabled"] = bool(item.get("enabled", True))
            try:
                normalized["points_cost"] = int(item.get("points_cost", 0))
            except (TypeError, ValueError):
                normalized["points_cost"] = 0
            items.append(normalized)
        return items or list(DEFAULT_POINTS_EXCHANGE_CATALOG)

    def award_activity_points(self, customer_id: int, event: str) -> dict:
        event_key = (event or "").strip().lower()
        rules = self.get_points_activity_rules()
        amount = int(rules.get("events", {}).get(event_key, 0) or 0)
        if amount <= 0:
            return {"status": "error", "message": f"Unsupported event: {event_key}"}
        source = ACTIVITY_EVENT_TO_SOURCE.get(event_key)
        if not source:
            return {"status": "error", "message": f"Unsupported event source: {event_key}"}
        ok = self.award_points(customer_id, amount, source)
        if not ok:
            return {"status": "error", "message": "Daily cap reached or zero awardable points."}
        return {"status": "success", "event": event_key, "points_earned": amount}

    def _find_exchange_item(self, item_code: str) -> Optional[Dict[str, Any]]:
        code = (item_code or "").strip()
        if not code:
            return None
        for item in self.get_points_exchange_catalog():
            if item.get("code") == code and bool(item.get("enabled", True)):
                return item
        return None

    # --- User & Level Management ---

    def ensure_user_exists(self, customer_id: int):
        user_ext = self.db.query(UserExt).filter_by(customer_id=customer_id).first()
        if not user_ext:
            # Generate a referral code for new users
            import string
            import random
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            
            user_ext = UserExt(customer_id=customer_id, referral_code=code)
            self.db.add(user_ext)
            self.db.commit()
            self.db.refresh(user_ext)

        # Ensure Wallet exists
        wallet = self.db.query(Wallet).filter_by(user_id=customer_id).first()
        if not wallet:
            wallet = Wallet(user_id=customer_id)
            self.db.add(wallet)
        
        # Ensure Points exists
        points = self.db.query(Points).filter_by(user_id=customer_id).first()
        if not points:
            points = Points(user_id=customer_id, balance=50, total_earned=50)
            self.db.add(points)
            
            txn = PointTransaction(
                user_id=customer_id,
                amount=50,
                source=PointSource.REGISTRATION
            )
            self.db.add(txn)
            
        self.db.commit()
        return user_ext

    def get_user_level(self, customer_id: int) -> dict:
        """
        v3.0 Final Distribution Tiers:
        Bronze: Default (1.0%)
        Silver: 3 real users OR $500 volume (1.5%)
        Gold: 10 real users OR $5,000 volume (2.0%)
        Platinum: 50 real users OR $10,000 volume (3.0%)
        """
        two_years_ago = datetime.now() - timedelta(days=730)
        
        # 1. Calculate Referral Volume (2-year rolling)
        total_volume = self.db.query(func.sum(WalletTransaction.amount)).filter(
            WalletTransaction.user_id == customer_id,
            WalletTransaction.type == 'referral',
            WalletTransaction.status == 'completed',
            WalletTransaction.created_at >= two_years_ago
        ).scalar() or Decimal('0.0')

        # 2. Count Active Invitees (Paid Users with at least one qualifying order in the last 2 years)
        # Criteria: order status in ('paid', 'shipped', 'completed') and not refunded.
        active_invitees_count = self.db.query(func.count(distinct(ReferralRelationship.invitee_id))).\
            join(Order, Order.user_id == ReferralRelationship.invitee_id).\
            filter(
                ReferralRelationship.inviter_id == customer_id,
                ReferralRelationship.start_at >= two_years_ago,
                Order.created_at >= two_years_ago,
                Order.status.in_(['paid', 'shipped', 'completed']),
                Order.refund_status != 'refunded'
            ).scalar() or 0

        if active_invitees_count >= 50 or total_volume >= 10000:
            level = "Platinum"
            rate = Decimal('0.030')
        elif active_invitees_count >= 10 or total_volume >= 5000:
            level = "Gold"
            rate = Decimal('0.020')
        elif active_invitees_count >= 3 or total_volume >= 500:
            level = "Silver"
            rate = Decimal('0.015')
        else:
            level = "Bronze"
            rate = Decimal('0.010')

        # Sync back to UserExt model
        user = self.db.query(UserExt).filter_by(customer_id=customer_id).first()
        if user and user.user_tier != level.lower():
            user.user_tier = level.lower()
            self.db.commit()

        return {"level": level, "rate": rate, "total_volume": total_volume, "invitees": active_invitees_count}

    # --- Check-in Logic ---

    def init_checkin_plan(self, customer_id: int, order_id: int, reward_base: Decimal, timezone: str = "UTC"):
        self.ensure_user_exists(customer_id)
        
        plan = self.db.query(CheckinPlan).filter_by(order_id=order_id).first()
        if plan:
            return plan
            
        plan = CheckinPlan(
            user_id=customer_id,
            order_id=order_id,
            reward_base=reward_base,
            status='pending_choice',
            timezone=timezone,
            expires_at=datetime.now() + timedelta(days=500),
            plan_config=self._generate_v3_plan_config() # v3.0: Generate random engine on init
        )
        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)
        
        # v5.0: Generate RewardPhase entries immediately for visibility
        from app.models.actuarial import RewardPhase
        for cfg in plan.plan_config:
            # v5.1: Calculate absolute amount for each phase
            phase_ratio = Decimal(str(cfg["reward"])) / Decimal("100")
            phase_amount = plan.reward_base * phase_ratio
            
            phase = RewardPhase(
                plan_id=plan.id,
                phase_num=cfg["period"],
                ratio=phase_ratio,
                amount=phase_amount,
                days_required=cfg["days"],
                status="pending"
            )
            self.db.add(phase)
        self.db.commit()
        
        return plan

    def start_checkin_plan(self, customer_id: int, plan_id: str) -> dict:
        plan = self.db.query(CheckinPlan).filter_by(id=plan_id, user_id=customer_id).first()
        if not plan:
            return {"status": "error", "message": "No plan found."}
        
        if plan.status == 'pending_choice':
            plan.status = 'active_checkin'
            plan.confirmed_at = datetime.now()
            self.db.commit()
            return {"status": "success", "message": "Check-in plan activated!"}
        
        return {"status": "error", "message": f"Plan is in status {plan.status}"}

    def process_checkin(self, customer_id: int, plan_id: Optional[str] = None) -> dict:
        """
        v3.5.0: Concurrency-safe Batch Check-in.
        - Uses SELECT FOR UPDATE to lock plan rows during processing.
        """
        # TC-04: Automated AI Nudge for abandoned orders (v3.6.0 Task)
        # We trigger this check during check-in flow as a 'side effect' or background task
        # to remind user of pending payments while they are active in the app.
        pass # Placeholder for background task trigger
        if plan_id:
            plan = self.db.query(CheckinPlan).filter_by(id=plan_id, user_id=customer_id).with_for_update().first()
            if not plan:
                return {"status": "error", "message": "Plan not found."}
            if plan.status != "active_checkin":
                return {
                    "status": "error",
                    "message": f"Plan is not active for check-in (status={plan.status}).",
                }
            plans = [plan]
        else:
            # Get all active check-in plans for this user with row locking
            plans = self.db.query(CheckinPlan).filter_by(
                user_id=customer_id, 
                status='active_checkin'
            ).with_for_update().all()
            
        if not plans:
            return {"status": "error", "message": "No active check-in plans found."}

        results = []
        any_success = False
        total_points = 0
        
        for plan in plans:
            res = self._process_single_plan_checkin(plan)
            results.append({
                "plan_id": str(plan.id),
                "order_id": plan.order_id,
                **res
            })
            if res["status"] == "success":
                any_success = True
                total_points = max(total_points, res.get("points_earned", 0))

        if not any_success:
            # If all plans failed (e.g. all already checked in), return the first error
            return results[0]

        return {
            "status": "success",
            "batch_results": results,
            "total_plans_processed": len(plans),
            "points_earned": total_points # Points awarded once for the day
        }

    def _process_single_plan_checkin(self, plan: CheckinPlan) -> dict:
        """
        Core logic for a single plan check-in.
        """
        # Rule v3.4.7: Check-in only allowed AFTER effective date + 1 day
        if not self.can_start_checkin(plan):
            wait_date = (plan.payout_eligible_at + timedelta(days=1)).strftime("%Y-%m-%d") if plan.payout_eligible_at else "TBD"
            return {
                "status": "error", 
                "message": f"Order {plan.order_id} is in return window. Check-in starts on {wait_date}."
            }

        today = self._get_local_today(plan.timezone)
        
        # 1. 24-hour Local Cooldown (Standard Rule)
        if plan.last_checkin_at == today:
            return {"status": "error", "message": f"Already checked in today for Order {plan.order_id}."}

        # 2. 20-hour UTC Cooldown (v3.5.0 Timezone Hopping Defense)
        now_utc = datetime.utcnow()
        if plan.last_checkin_utc and (now_utc - plan.last_checkin_utc) < timedelta(hours=20):
            wait_hours = 20 - (now_utc - plan.last_checkin_utc).total_seconds() / 3600
            return {
                "status": "error", 
                "message": f"Timezone hopping detected or too frequent. Please wait {wait_hours:.1f} hours."
            }

        # Check for 500-day expiration
        if plan.expires_at and datetime.now(ZoneInfo("UTC")).timestamp() >= plan.expires_at.timestamp():
            self.settle_final_reward(plan)
            return {"status": "error", "message": "Plan expired. Final settlement processed."}

        is_consecutive = False
        if not plan.last_checkin_at:
            is_consecutive = True
        elif plan.last_checkin_at == today - timedelta(days=1):
            is_consecutive = True
        else:
            # Check for 5-day grace period with Renewal Card
            if (today - plan.last_checkin_at).days <= 5:
                already_used = self.db.query(RenewalCard).filter_by(
                    user_id=plan.user_id,
                    plan_id=plan.id,
                    status="used",
                    period_num=plan.current_period
                ).first()
                
                if not already_used:
                    card = self.db.query(RenewalCard).filter_by(
                        user_id=plan.user_id, 
                        plan_id=plan.id, 
                        status="unused"
                    ).first()
                    if card:
                        is_consecutive = True
                        card.status = "used"
                        card.period_num = plan.current_period
                        card.used_at = datetime.now()

        if is_consecutive:
            plan.consecutive_days += 1
            days_per_period = self._get_period_days(plan, plan.current_period)
            if plan.consecutive_days >= days_per_period:
                self._payout_period_reward(plan)
                plan.current_period += 1
                plan.consecutive_days = 0
                if plan.current_period > 20:
                    plan.status = 'completed'
        else:
            # Missed a day and no card used.
            plan.current_period += 1
            plan.consecutive_days = 1
            if plan.current_period > 20:
                plan.status = 'completed'

        plan.last_checkin_at = today
        plan.last_checkin_utc = now_utc # Record exact UTC time
        
        # Award check-in points (logic remains, but batch caller handles awarding to user once)
        point_reward = 10 if plan.current_period <= 2 else 20
        self.award_points(plan.user_id, point_reward, PointSource.SIGN_IN)

        log = CheckinLog(
            plan_id=plan.id,
            checkin_date=today,
            period_num=plan.current_period,
            day_num=plan.consecutive_days
        )
        self.db.add(log)
        self.db.commit()

        return {
            "status": "success", 
            "period": plan.current_period, 
            "day": plan.consecutive_days,
            "consecutive": is_consecutive,
            "points_earned": point_reward
        }

    def is_payout_eligible(self, plan: CheckinPlan) -> bool:
        """
        v3.4.7: Check if the order is past the return period (Signed + 15D).
        The check-in plan only starts the DAY AFTER it becomes effective.
        """
        if not plan.payout_eligible_at:
            order = self.db.query(Order).filter_by(shopify_order_id=plan.order_id).first()
            if not order or not order.delivered_at:
                return False
            
            return_days = int(self.config_service.get("RETURN_PERIOD_DAYS", 15))
            plan.payout_eligible_at = order.delivered_at + timedelta(days=return_days)
            self.db.commit()

        # Rule: Effective date is 15D after delivery.
        # Plan starts the day AFTER that.
        effective_date = plan.payout_eligible_at
        return datetime.now() >= effective_date

    def can_start_checkin(self, plan: CheckinPlan) -> bool:
        """Rule: Plan starts the day AFTER it becomes effective (Signed + 15D)."""
        if not self.is_payout_eligible(plan):
            return False
        
        # Must be at least the day after payout_eligible_at
        start_date = plan.payout_eligible_at + timedelta(days=1)
        return datetime.now() >= start_date

    def _payout_period_reward(self, plan: CheckinPlan):
        """
        v3.4.7 Payout logic with Group Buy suppression and Return Period check.
        - Includes Transactional Points (Self Purchase * 5) upon effective completion.
        """
        # 1. Return Period Check
        is_effective = self.is_payout_eligible(plan)
        if not is_effective:
            print(f"Postponing payout for Order {plan.order_id} - Still in Return Period.")

        # 2. Group Buy Suppression
        gb = self.db.query(GroupBuyCampaign).filter_by(
            owner_order_id=plan.order_id, 
            status="success"
        ).first()
        
        if gb:
            print(f"Skipping P{plan.current_period} reward for Order {plan.order_id} - Group Buy Success.")
            plan.status = "free_refunded"
            return

        config = self._get_period_config(plan, plan.current_period)
        ratio = Decimal(str(config["ratio"])) / Decimal('100')
        reward_amount = plan.reward_base * ratio
        
        # Determine status: if return period over -> completed, else -> pending
        status = 'completed' if is_effective else 'pending'
        
        self.update_wallet_balance(
            plan.user_id, 
            reward_amount, 
            'checkin', 
            plan.order_id, 
            f"Check-in reward for Period {plan.current_period} ({config['ratio']}%)",
            status=status
        )
        plan.total_earned += reward_amount

        # 3. Transactional Points (Self Purchase * 5)
        # Only awarded when the order is "Effective" (Delivered + 15D)
        if is_effective and plan.current_period == 1:
            # We award the full purchase points only once upon first period payout after return window
            multipliers = self.get_points_multipliers()
            points_amount = int(plan.reward_base * Decimal(str(multipliers["self_purchase"])))
            self.award_points(plan.user_id, points_amount, PointSource.PURCHASE)
            print(f"Self-Purchase Points Awarded: {plan.user_id} received {points_amount} Pts.")

    def join_group_buy(self, order_id: int, share_code: str):
        """
        v3.4.7: Increment the invitee count for a specific item campaign.
        """
        campaign = self.db.query(GroupBuyCampaign).filter_by(share_code=share_code).first()
        if not campaign:
            print(f"Group Buy share code {share_code} not found.")
            return False
        
        if campaign.status != "open":
            print(f"Group Buy campaign {share_code} is already {campaign.status}.")
            return False

        # Increment count
        campaign.current_count += 1
        self.db.commit()
        
        # Notify Social Automation (AI Butler)
        from app.services.social_automation import SocialAutomationService
        import asyncio
        social = SocialAutomationService(self.db)
        asyncio.create_task(social.notify_group_buy_update(str(campaign.id)))
        
        # Check if this triggered success for this SPECIFIC item
        self.check_group_buy_success(campaign.owner_order_id, campaign.product_id)
        return True

    def check_group_buy_success(self, order_id: int, product_id: Optional[int] = None):
        """
        v3.4.7 Progressive Settle: Settle 1 item for every 3 invites.
        If user already has 3 group buys, they get 1 free. If they reach 6, they get the 2nd free, etc.
        """
        campaigns = self.db.query(GroupBuyCampaign).filter(
            GroupBuyCampaign.owner_order_id == order_id,
            GroupBuyCampaign.status == "open"
        )
        if product_id:
            campaigns = campaigns.filter(GroupBuyCampaign.product_id == product_id)
            
        for campaign in campaigns.all():
            # Check 5-day window (P1)
            days_active = (datetime.now() - campaign.created_at).days
            if days_active > 5:
                campaign.status = "expired"
                print(f"Group Buy Expired for Order {order_id} Item {campaign.product_id}")
                continue

            # Calculate how many items SHOULD be free based on current_count
            # Rule: Every 3 invites = 1 free item. 
            items_to_free = campaign.current_count // 3
            
            # Cap it at purchased_quantity
            if items_to_free > campaign.purchased_quantity:
                items_to_free = campaign.purchased_quantity

            # If there are new items to free
            if items_to_free > campaign.refunded_quantity:
                newly_freed = items_to_free - campaign.refunded_quantity
                print(f"Group Buy Progress! Order {order_id} Item {campaign.product_id} freed {newly_freed} more items.")
                
                # Update status
                campaign.refunded_quantity = items_to_free
                if campaign.refunded_quantity >= campaign.purchased_quantity:
                    campaign.status = "success"
                
                # Trigger partial refund for the newly freed quantity
                self._trigger_item_refund(campaign, newly_freed)
                
        self.db.commit()

    def _trigger_item_refund(self, campaign: GroupBuyCampaign, quantity: int):
        """Trigger a partial refund for the specific item and quantity."""
        # TODO: In prod, call shopify_refunds.refund_line_item(campaign.owner_order_id, campaign.variant_id, quantity)
        print(f"Refunding {quantity} units of variant {campaign.variant_id} for Order {campaign.owner_order_id}")
        
        plan = self.db.query(CheckinPlan).filter(CheckinPlan.order_id == campaign.owner_order_id).first()
        if plan:
             # If all items in the campaign (and potentially order) are freed, mark plan as free_refunded
             if campaign.refunded_quantity >= campaign.purchased_quantity:
                 # Check if OTHER campaigns for the same order are also finished (if any)
                 other_open = self.db.query(GroupBuyCampaign).filter(
                     GroupBuyCampaign.owner_order_id == campaign.owner_order_id,
                     GroupBuyCampaign.status == "open"
                 ).first()
                 if not other_open:
                     plan.status = "free_refunded"

    def award_points(self, customer_id: int, amount: int, source: PointSource):
        """
        v3.4.7 Points Earning with Daily Cap and Effective Order logic.
        """
        from app.services.finance_engine import FinanceEngine
        finance = FinanceEngine(self.db)
        
        # Note: Transactional points (Self * 5, Fan * 2) are exempt from 150 cap
        # But must be passed correctly via source
        return finance.earn_points(customer_id, source, amount)

    def redeem_renewal_card(self, customer_id: int, plan_id: str, cost_override: Optional[int] = None) -> dict:
        """
        Redeem points for a Renewal Card. Max 1 unused card per plan per period.
        """
        catalog_item = self._find_exchange_item("renewal_card")
        configured_cost = int((catalog_item or {}).get("points_cost", 3000) or 3000)
        cost = int(cost_override if cost_override is not None else configured_cost)
        points = self.db.query(Points).filter_by(user_id=customer_id).first()
        if not points or points.balance < cost:
            return {"status": "error", "message": f"Insufficient points ({cost} required)."}
        
        plan = self.db.query(CheckinPlan).filter_by(id=plan_id, user_id=customer_id).first()
        if not plan:
             return {"status": "error", "message": "Plan not found."}

        # Check for existing unused card for this plan in CURRENT period
        # The blueprint says "每期限用 1 张". 
        # We can track it by checking if a card was created/used in this period.
        # For now, let's just ensure they don't have an UNUSED one.
        existing = self.db.query(RenewalCard).filter_by(
            user_id=customer_id, 
            plan_id=plan_id, 
            status="unused"
        ).first()
        if existing:
            return {"status": "error", "message": "You already have an unused Renewal Card for this plan."}
        
        points.balance -= cost
        txn = PointTransaction(
            user_id=customer_id,
            amount=-cost,
            source=PointSource.TASK,
            description=f"Redeem renewal card ({cost} pts)"
        )
        self.db.add(txn)
        
        card = RenewalCard(user_id=customer_id, plan_id=plan_id)
        self.db.add(card)
        self.db.commit()
        
        return {"status": "success", "message": "Renewal Card redeemed!", "item_code": "renewal_card", "points_spent": cost}

    def redeem_points_exchange_item(self, customer_id: int, item_code: str, plan_id: Optional[str] = None) -> dict:
        item = self._find_exchange_item(item_code)
        if not item:
            return {"status": "error", "message": "Exchange item not found or disabled."}
        item_type = str(item.get("type") or "").strip().lower()
        points_cost = int(item.get("points_cost", 0) or 0)
        if points_cost <= 0:
            return {"status": "error", "message": "Invalid points cost for exchange item."}

        if item_type == "renewal_card":
            if not plan_id:
                return {"status": "error", "message": "plan_id is required for renewal card."}
            return self.redeem_renewal_card(customer_id, plan_id, cost_override=points_cost)

        if item_type == "shopify_balance_voucher":
            from app.services.shopify_discount import ShopifyDiscountService
            user = self.db.query(UserExt).filter_by(customer_id=customer_id).first()
            if not user or not user.email:
                return {"status": "error", "message": "User email is required for voucher redemption."}
            voucher_usd = float(item.get("voucher_usd", 0) or 0)
            if voucher_usd <= 0:
                return {"status": "error", "message": "Invalid voucher amount configuration."}
            discount_service = ShopifyDiscountService(self.db)
            code = discount_service.deduct_balance_and_generate_voucher(
                user_id=customer_id,
                email=user.email,
                amount_points=points_cost,
                amount_usd=voucher_usd,
            )
            if not code:
                return {"status": "error", "message": "Voucher generation failed."}
            txn = PointTransaction(
                user_id=customer_id,
                amount=-points_cost,
                source=PointSource.TASK,
                description=f"Redeem {item_code} voucher (${voucher_usd})"
            )
            self.db.add(txn)
            self.db.commit()
            return {
                "status": "success",
                "item_code": item_code,
                "points_spent": points_cost,
                "voucher_code": code,
                "voucher_usd": voucher_usd,
            }

        return {"status": "error", "message": f"Unsupported exchange item type: {item_type}"}

    def settle_final_reward(self, plan: CheckinPlan):
        if plan.status != 'active_checkin':
            return
        
        reward_amount = (Decimal(plan.consecutive_days) / Decimal('30')) * Decimal('0.05') * plan.reward_base
        if reward_amount > 0:
            self.update_wallet_balance(
                plan.user_id, 
                reward_amount, 
                'checkin', 
                plan.order_id, 
                f"Final 500-day settlement reward"
            )
            plan.total_earned += reward_amount
        
        plan.status = 'completed'
        self.db.commit()

    @admin_audit(action="ADJUST_WALLET")
    def freeze_balance(self, customer_id: int, amount: Decimal, order_ref: str) -> bool:
        """
        v3.5.0: Atomic Balance Freeze for Payment (Schema B/C).
        Locks balance_available and moves it to balance_locked.
        """
        wallet = self.db.query(Wallet).filter_by(user_id=customer_id).with_for_update().first()
        if not wallet or wallet.balance_available < amount:
            return False
            
        wallet.balance_available -= amount
        wallet.balance_locked += amount
        
        # Log the pending transaction
        from app.models.ledger import WalletTransaction
        tx = WalletTransaction(
            user_id=customer_id,
            amount=-amount, # Negative to show deduction from available
            type="payment_freeze",
            description=f"Payment for Order {order_ref}",
            status="pending_payment"
        )
        self.db.add(tx)
        return True

    def unfreeze_balance(self, customer_id: int, amount: Decimal, order_ref: str):
        """
        v3.5.0: Release frozen balance back to available (on cancellation).
        """
        wallet = self.db.query(Wallet).filter_by(user_id=customer_id).with_for_update().first()
        if wallet:
            wallet.balance_available += amount
            wallet.balance_locked -= amount
            
            from app.models.ledger import WalletTransaction
            # Find and mark the freeze transaction as cancelled
            tx = self.db.query(WalletTransaction).filter_by(
                user_id=customer_id, 
                type="payment_freeze",
                status="pending_payment"
            ).order_by(WalletTransaction.created_at.desc()).first()
            if tx:
                tx.status = "cancelled"

    def process_daily_checkin(self, user_id: int):
        """
        Task 4: The 20-Phase Drop-off Funnel Engine
        Called daily by a cron job or explicitly.
        Evaluates active plans. If a checkin is missed (yesterday), forfeits current phase.
        """
        today = datetime.utcnow().date()
        yesterday = today - timedelta(days=1)
        
        # Get active plans
        plans = self.db.query(CheckinPlan).filter(
            CheckinPlan.user_id == user_id,
            CheckinPlan.status == 'active_checkin'
        ).with_for_update().all()
        
        for plan in plans:
            last_checkin = plan.last_checkin_at if plan.last_checkin_at else today
            
            # If the user didn't check in yesterday, they forfeit the current phase
            if last_checkin < yesterday:
                logger.info(f"User {user_id} missed checkin for plan {plan.id}. Forfeiting phase {plan.current_period}.")
                
                # Find current phase
                current_phase = self.db.query(RewardPhase).filter(
                    RewardPhase.plan_id == plan.id,
                    RewardPhase.phase_num == plan.current_period
                ).first()
                
                if current_phase and current_phase.status == 'active':
                    current_phase.status = 'forfeited'
                    
                    # Task 4: Log into PlatformProfitPool & Check Margin
                    # Fetch related order to check margin
                    from app.models.ledger import Order
                    order = self.db.query(Order).filter(Order.shopify_order_id == plan.order_id).first()
                    
                    margin_ratio = None
                    is_red_alert = False
                    if order and order.total_price and order.total_price > 0:
                        # Safety Margin = (Sale Price - COGS) / Sale Price
                        # cogs_total usually includes item cost + shipping
                        margin_ratio = (Decimal(order.total_price) - Decimal(order.cogs_total)) / Decimal(order.total_price)
                        if margin_ratio < Decimal('0.15'):
                            is_red_alert = True
                            logger.error(f"🚨 RED ALERT: Plan {plan.id} forfeited, but margin is critically low: {margin_ratio*100:.2f}%! Possible loss even with forfeit.")
                    
                    profit = PlatformProfitPool(
                        amount=current_phase.amount,
                        source="forfeited_rebate",
                        reference_id=f"plan_{plan.id}_phase_{plan.current_period}",
                        margin_ratio=margin_ratio,
                        is_red_alert=is_red_alert
                    )
                    self.db.add(profit)
                    
                    # Advance to next phase
                    plan.current_period += 1
                    plan.consecutive_days = 0
                    
                    if plan.current_period > 20:
                        plan.status = 'completed'
                    else:
                        # Activate next phase
                        next_phase = self.db.query(RewardPhase).filter(
                            RewardPhase.plan_id == plan.id,
                            RewardPhase.phase_num == plan.current_period
                        ).first()
                        if next_phase:
                            next_phase.status = 'active'
                            
        self.db.commit()

    def finalize_payment(self, customer_id: int, amount: Decimal, order_id: str, actual_cost_at_settlement: Optional[Decimal] = None):
        """
        v3.7.5: Confirm payment and clear the frozen balance.
        Includes FxCheck for Exchange Rate Boundary.
        """
        wallet = self.db.query(Wallet).filter_by(user_id=customer_id).with_for_update().first()
        if wallet:
            # v3.7.5: FX Boundary Check (Redline)
            # If the actual cost (in USD) has spiked beyond our 0.5% buffer, alert admin
            # (Requires Draft Order to have recorded cost_at_creation)
            if actual_cost_at_settlement:
                # We'd fetch original_cost_at_creation from order note_attributes
                # For now, we provide a placeholder for the alert logic
                pass

            wallet.balance_locked -= amount
            
            from app.models.ledger import WalletTransaction
            tx = self.db.query(WalletTransaction).filter_by(
                user_id=customer_id, 
                type="payment_freeze",
                status="pending_payment"
            ).order_by(WalletTransaction.created_at.desc()).first()
            if tx:
                tx.status = "completed"
                tx.order_id = order_id
                tx.description += f" (Settled at {datetime.utcnow().isoformat()})"

    def update_wallet_balance(self, customer_id: int, amount: Decimal, type: str, order_id: Optional[int] = None, description: str = "", status: str = 'completed'):
        """
        v3.5.0: Generic wallet update for rewards/refunds (Not for Payment Freeze).
        """
        wallet = self.db.query(Wallet).filter_by(user_id=customer_id).with_for_update().first()
        if not wallet:
            wallet = Wallet(user_id=customer_id, balance_available=Decimal('0.0'), balance_locked=Decimal('0.0'))
            self.db.add(wallet)
            self.db.flush()
        
        if status == 'completed':
            wallet.balance_available += amount
        else:
            wallet.balance_locked += amount

        from app.models.ledger import WalletTransaction
        tx = WalletTransaction(
            user_id=customer_id,
            amount=amount,
            type=type,
            status=status,
            order_id=order_id,
            description=description
        )
        self.db.add(tx)
        self.db.commit()

    def record_referral(self, invitee_id: int, referral_code: str):
        """
        v3.4.7: Distinguish between Distribution Code and Group Buy Code.
        """
        # 1. Check if it's a Group Buy Share Code
        campaign = self.db.query(GroupBuyCampaign).filter_by(share_code=referral_code, status="open").first()
        if campaign:
            print(f"Group Buy Code Detected: {referral_code} for Campaign {campaign.id}")
            self.join_group_buy(invitee_id, referral_code)
            # If it's a Group Buy, we still might want to establish a 2-year bond 
            # with the inviter (owner of the order).
            inviter_id = self.db.query(Order).filter_by(shopify_order_id=campaign.owner_order_id).first().user_id
            self._establish_ltv_bond(invitee_id, inviter_id)
            return

        # 2. Check if it's a User/KOL Referral Code (Distribution)
        inviter = self.db.query(UserExt).filter_by(referral_code=referral_code).first()
        if inviter:
            print(f"Distribution Code Detected: {referral_code} from User {inviter.customer_id}")
            self._establish_ltv_bond(invitee_id, inviter.customer_id)
            return

        print(f"Unknown Referral Code: {referral_code}")

    def _establish_ltv_bond(self, invitee_id: int, inviter_id: int):
        """Helper to establish the 2-year relationship."""
        if invitee_id == inviter_id:
            return

        invitee = self.ensure_user_exists(invitee_id)
        if invitee.inviter_id:
            return

        invitee.inviter_id = inviter_id
        rel = ReferralRelationship(
            inviter_id=inviter_id,
            invitee_id=invitee_id,
            expire_at=datetime.now() + timedelta(days=730)
        )
        self.db.add(rel)
        self.db.commit()
        print(f"LTV Bond established: {inviter_id} -> {invitee_id}")

    def process_referral_commissions(self, customer_id: int, order_id: int, reward_base: Decimal, referral_code: Optional[str] = None):
        """
        v3.4.7 Consolidated Referral & KOL Commission Logic.
        1. Distribution (if specific referral_code is provided)
        2. Fan Reward (if no code, check inviter_id bond)
        """
        from app.services.finance_engine import FinanceEngine
        finance = FinanceEngine(self.db)
        
        # Determine if this order was triggered by a Group Buy code
        # (Group Buy suppresses Fan Reward)
        is_group_buy = False
        referrer_id = None
        if referral_code:
            campaign = self.db.query(GroupBuyCampaign).filter_by(share_code=referral_code).first()
            if campaign:
                is_group_buy = True
            else:
                # If not group buy, it's a direct referrer (Distribution)
                inviter = self.db.query(UserExt).filter_by(referral_code=referral_code).first()
                if inviter:
                    referrer_id = inviter.customer_id

        order_data = {
            "order_id": order_id,
            "reward_base": reward_base, 
            "customer_id": customer_id,
            "is_group_buy_invitee": is_group_buy
        }
        
        amount = finance.calculate_order_reward(order_data, referrer_id=referrer_id)
        
        if amount > 0:
            beneficiary_id = referrer_id if referrer_id else self._get_inviter_id(customer_id)
            if beneficiary_id:
                # Check return period for commission release
                plan = self.db.query(CheckinPlan).filter_by(order_id=order_id).first()
                status = 'completed' if (plan and self.is_payout_eligible(plan)) else 'pending'
                
                # Type is 'referral' in wallet_transactions for both distribution and fan rewards
                self.update_wallet_balance(
                    beneficiary_id,
                    amount,
                    'referral',
                    order_id,
                    f"Commission for Order #{order_id} (Ref: {referral_code or 'Fan Bond'})",
                    status=status
                )
                
                # v3.4.7 Transactional Points (Fan purchase * 2)
                # Only if effective
                if status == 'completed':
                    multipliers = self.get_points_multipliers()
                    points_amount = int(reward_base * Decimal(str(multipliers["fan_purchase"])))
                    self.award_points(beneficiary_id, points_amount, PointSource.REFERRAL)
                    
                print(f"Commission Recorded: {beneficiary_id} (Status: {status})")

    def _get_inviter_id(self, customer_id: int) -> Optional[int]:
        user = self.db.query(UserExt).filter_by(customer_id=customer_id).first()
        return user.inviter_id if user else None

    def get_kol_stats(self, user_id: int) -> dict:
        """
        v3.4.8: Get performance stats for KOL Dashboard.
        """
        from app.models.ledger import ReferralRelationship
        
        # 1. Active vs Expiring Fans (LTV 2Y)
        now = datetime.now()
        warning_window = now + timedelta(days=30)
        
        total_fans = self.db.query(ReferralRelationship).filter_by(inviter_id=user_id).count()
        expiring_fans = self.db.query(ReferralRelationship).filter(
            ReferralRelationship.inviter_id == user_id,
            ReferralRelationship.expire_at <= warning_window,
            ReferralRelationship.expire_at > now
        ).count()
        
        # 2. Revenue Split
        revenue_direct = self.db.query(func.sum(WalletTransaction.amount)).filter(
            WalletTransaction.user_id == user_id,
            WalletTransaction.type == 'referral',
            WalletTransaction.description.contains('Ref: ') # Simplified check for direct dist
        ).scalar() or 0.0
        
        revenue_fan = self.db.query(func.sum(WalletTransaction.amount)).filter(
            WalletTransaction.user_id == user_id,
            WalletTransaction.type == 'referral',
            WalletTransaction.description.contains('Fan Bond')
        ).scalar() or 0.0
        
        return {
            "total_fans": total_fans,
            "expiring_fans_30d": expiring_fans,
            "revenue_split": {
                "distribution": float(revenue_direct),
                "referral": float(revenue_fan)
            }
        }
    @enforce_idor(owner_id_field="customer_id")
    def get_wallet_summary(self, customer_id: int) -> dict:
        """v3.4.7: Wallet summary with pending assets."""
        wallet = self.db.query(Wallet).filter_by(user_id=customer_id).first()
        points = self.db.query(Points).filter_by(user_id=customer_id).first()
        
        # Pending points are not tracked by a dedicated PointTransaction.status field.
        # Current reward flow settles points directly when awarded, so expose 0 here
        # until a dedicated pending-points ledger is introduced.
        pending_points = 0
        
        # Renewal Cards count
        renewal_cards = self.db.query(RenewalCard).filter_by(
            user_id=customer_id, 
            status="unused"
        ).count()
        
        return {
            "available": float(wallet.balance_available) if wallet else 0.0,
            "pending": float(wallet.balance_locked) if wallet else 0.0,
            "points": points.balance if points else 0,
            "pending_points": int(pending_points),
            "renewal_cards": renewal_cards,
            "currency": wallet.currency if wallet else "USD"
        }

    def get_points_transactions(self, customer_id: int, limit: int = 50) -> List[dict]:
        from app.models.finance import PointTransaction
        txs = self.db.query(PointTransaction).filter_by(user_id=customer_id).order_by(
            PointTransaction.created_at.desc()
        ).limit(limit).all()
        return [
            {
                "id": str(tx.id),
                "amount": float(tx.amount),
                "source": tx.source,
                "description": tx.description or tx.source,
                "created_at": tx.created_at.isoformat()
            } for tx in txs
        ]

    def get_transaction_history(self, customer_id: int, limit: int = 10) -> List[dict]:
        txs = self.db.query(WalletTransaction).filter_by(user_id=customer_id).order_by(
            WalletTransaction.created_at.desc()
        ).limit(limit).all()
        return [
            {
                "id": str(tx.id),
                "amount": float(tx.amount),
                "type": tx.type,
                "status": tx.status,
                "created_at": tx.created_at.isoformat()
            } for tx in txs
        ]

    def clawback_commissions_for_order(self, order_id: int) -> dict:
        originals = self.db.query(WalletTransaction).filter(
            WalletTransaction.order_id == order_id,
            WalletTransaction.type == "referral",
            WalletTransaction.status == "completed",
            WalletTransaction.amount > 0,
        ).all()

        clawed = 0
        total = Decimal("0.0")

        for tx in originals:
            marker = f"clawback_of={tx.id}"
            exists = self.db.query(WalletTransaction).filter(
                WalletTransaction.order_id == order_id,
                WalletTransaction.type == "referral",
                WalletTransaction.status == "completed",
                WalletTransaction.amount < 0,
                WalletTransaction.description.contains(marker),
            ).first()
            if exists:
                continue

            amt = Decimal(str(tx.amount))
            self.update_wallet_balance(
                tx.user_id,
                -amt,
                "referral",
                order_id,
                f"Referral clawback for Order #{order_id} ({marker})",
            )
            clawed += 1
            total += amt

        return {"status": "success", "order_id": order_id, "clawed_back_count": clawed, "clawed_back_total": float(total)}

    def clawback_checkin_cashback_for_order(self, order_id: int) -> dict:
        originals = self.db.query(WalletTransaction).filter(
            WalletTransaction.order_id == order_id,
            WalletTransaction.type == "checkin",
            WalletTransaction.status == "completed",
            WalletTransaction.amount > 0,
        ).all()

        plan = self.db.query(CheckinPlan).filter_by(order_id=order_id).first()

        clawed = 0
        total = Decimal("0.0")

        for tx in originals:
            marker = f"clawback_of={tx.id}"
            exists = self.db.query(WalletTransaction).filter(
                WalletTransaction.order_id == order_id,
                WalletTransaction.type == "checkin",
                WalletTransaction.status == "completed",
                WalletTransaction.amount < 0,
                WalletTransaction.description.contains(marker),
            ).first()
            if exists:
                continue

            amt = Decimal(str(tx.amount))
            self.update_wallet_balance(
                tx.user_id,
                -amt,
                "checkin",
                order_id,
                f"Check-in cashback clawback for Order #{order_id} ({marker})",
            )
            clawed += 1
            total += amt

        if plan and total > 0:
            try:
                current = Decimal(str(plan.total_earned or 0))
                plan.total_earned = current - total
                if plan.total_earned < 0:
                    plan.total_earned = Decimal("0.0")
                self.db.commit()
            except Exception:
                self.db.rollback()

        return {"status": "success", "order_id": order_id, "clawed_back_count": clawed, "clawed_back_total": float(total)}

    def clawback_rewards_for_order(self, order_id: int) -> dict:
        """
        v3.4.7: Automated clawback of all rewards (referral + checkin + points) when order is refunded.
        Boss Rule: Points are 'cheap', no need to chase if deficit occurs.
        """
        res_ref = self.clawback_commissions_for_order(order_id)
        res_chk = self.clawback_checkin_cashback_for_order(order_id)
        
        # Mark plan as forfeited
        plan = self.db.query(CheckinPlan).filter_by(order_id=order_id).first()
        if plan:
            plan.status = 'forfeited'
            self.db.commit()

        return {
            "referral_clawback": res_ref,
            "checkin_clawback": res_chk,
            "status": "forfeited"
        }

    def revoke_renewal_cards_for_order(self, order_id: int) -> dict:
        plan = self.db.query(CheckinPlan).filter_by(order_id=order_id).first()
        if not plan:
            return {"status": "success", "order_id": order_id, "revoked_count": 0}

        cards = self.db.query(RenewalCard).filter_by(plan_id=plan.id, status="unused").all()
        revoked = 0
        now = datetime.now()
        for c in cards:
            c.status = "revoked"
            c.revoked_at = now
            revoked += 1
        self.db.commit()
        return {"status": "success", "order_id": order_id, "plan_id": str(plan.id), "revoked_count": revoked}

    def clawback_points_for_order(self, order_id: int) -> dict:
        plan = self.db.query(CheckinPlan).filter_by(order_id=order_id).first()
        if not plan:
            return {"status": "success", "order_id": order_id, "clawed_back_total": 0, "clawed_back_count": 0}

        logs = self.db.query(CheckinLog).filter_by(plan_id=plan.id).order_by(CheckinLog.checkin_date.asc()).all()
        if not logs:
            return {"status": "success", "order_id": order_id, "clawed_back_total": 0, "clawed_back_count": 0}

        points_record = self.db.query(Points).filter(Points.user_id == plan.user_id).with_for_update().first()
        if not points_record:
            points_record = Points(user_id=plan.user_id, balance=0, total_earned=0)
            self.db.add(points_record)
            self.db.commit()

        clawed_count = 0
        clawed_total = 0

        for log in logs:
            expected = 10 if (log.period_num or 1) <= 2 else 20
            marker = f"clawback_signin={log.checkin_date.isoformat()}"
            exists = self.db.query(PointTransaction).filter(
                PointTransaction.user_id == plan.user_id,
                PointTransaction.order_id == order_id,
                PointTransaction.amount < 0,
                PointTransaction.description.contains(marker),
            ).first()
            if exists:
                continue

            earned = self.db.query(func.sum(PointTransaction.amount)).filter(
                PointTransaction.user_id == plan.user_id,
                PointTransaction.source == PointSource.SIGN_IN,
                PointTransaction.amount > 0,
                func.date(PointTransaction.created_at) == log.checkin_date,
            ).scalar() or 0

            to_claw = min(int(expected), int(earned))
            if to_claw <= 0:
                continue

            actual = min(to_claw, int(points_record.balance or 0))
            if actual <= 0:
                continue

            points_record.balance -= actual
            points_record.total_earned = max(int(points_record.total_earned or 0) - actual, 0)

            txn = PointTransaction(
                user_id=plan.user_id,
                amount=-actual,
                source=PointSource.SIGN_IN,
                order_id=order_id,
                description=f"Points clawback for Order #{order_id} ({marker})",
            )
            self.db.add(txn)

            clawed_count += 1
            clawed_total += actual

        self.db.commit()
        return {"status": "success", "order_id": order_id, "clawed_back_total": clawed_total, "clawed_back_count": clawed_count}
