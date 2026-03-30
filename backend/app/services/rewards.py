from datetime import datetime, date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from zoneinfo import ZoneInfo
from backend.app.models.rewards import (
    UserExt, Wallet, WalletTransaction, CheckinPlan, CheckinLog, ReferralRelationship, GroupBuyCampaign
)

class RewardsService:
    def __init__(self, db: Session):
        self.db = db

    def _get_period_days(self, period_num: int) -> int:
        """
        P1: 5 days
        P2: 10 days
        P3-P20: 30 days
        Total: 5 + 10 + 18*30 = 555 days
        """
        if period_num == 1:
            return 5
        if period_num == 2:
            return 10
        return 30

    def _get_local_today(self, timezone_str: str) -> date:
        tz = ZoneInfo(timezone_str) if timezone_str else ZoneInfo("UTC")
        return datetime.now(tz).date()

    # --- User & Level Management ---

    def get_user_level(self, customer_id: int) -> dict:
        """
        Silver: $0 - $1,000 (1.5%)
        Gold: $1,000 - $5,000 (2.0%)
        Platinum: > $5,000 (3.0%)
        """
        # Calculate 2-year accumulated referral transaction volume
        two_years_ago = datetime.now() - timedelta(days=730)
        
        # This is a simplified calculation. Real logic would sum 'completed' orders 
        # from ReferralRelationship linked users.
        total_volume = self.db.query(func.sum(WalletTransaction.amount)).filter(
            WalletTransaction.user_id == customer_id,
            WalletTransaction.type == 'referral',
            WalletTransaction.status == 'completed',
            WalletTransaction.created_at >= two_years_ago
        ).scalar() or Decimal('0.0')

        if total_volume <= 1000:
            level = "Silver"
            rate = Decimal('0.015')
        elif total_volume <= 5000:
            level = "Gold"
            rate = Decimal('0.020')
        else:
            level = "Platinum"
            rate = Decimal('0.030')

        return {"level": level, "rate": rate, "total_volume": total_volume}

    # --- Check-in Logic ---

    def process_checkin(self, customer_id: int, plan_id: str) -> dict:
        """
        Updated Strict Consecutive Rule (v1.0):
        - If today is the next day after last_checkin_at, continue the current period.
        - If a day was missed, fail current period and start Next Period Day 1.
        - 555 Days Total: P1=5d, P2=10d, P3-P20=30d.
        """
        plan = self.db.query(CheckinPlan).filter_by(id=plan_id, user_id=customer_id).first()
        if not plan or plan.status != 'active_checkin':
            return {"status": "error", "message": "No active check-in plan found."}

        # Timezone Adaptation (User Local Time)
        today = self._get_local_today(plan.timezone)
        
        if plan.last_checkin_at == today:
            return {"status": "error", "message": "Already checked in today."}

        # Check for 555-day forced settlement
        if plan.expires_at:
            # We use UTC comparison for absolute expiration
            if datetime.now(ZoneInfo("UTC")).timestamp() >= plan.expires_at.timestamp():
                self.settle_final_reward(plan)
                return {"status": "error", "message": "Plan expired. Final settlement processed."}

        days_per_period = self._get_period_days(plan.current_period)

        is_consecutive = False
        if plan.last_checkin_at:
            if plan.last_checkin_at == today - timedelta(days=1):
                is_consecutive = True

        if is_consecutive:
            plan.consecutive_days += 1
            # Check if period completed
            if plan.consecutive_days >= days_per_period:
                self._payout_period_reward(plan)
                plan.current_period += 1
                plan.consecutive_days = 0 # Reset for next period
                if plan.current_period > 20:
                    plan.status = 'completed'
        else:
            # Missed a day! Strict rule applies. (Auto-next-period)
            # Lose current period progress and start Day 1 of Next Period.
            plan.current_period += 1
            plan.consecutive_days = 1 
            if plan.current_period > 20:
                plan.status = 'completed'
            # Note: The reward for the skipped period is lost.

        plan.last_checkin_at = today
        
        # Log the check-in
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
            "days_per_period": self._get_period_days(plan.current_period)
        }

    def _payout_period_reward(self, plan: CheckinPlan):
        # 5% of reward_base per period
        reward_amount = plan.reward_base * Decimal('0.05')
        self.update_wallet_balance(
            plan.user_id, 
            reward_amount, 
            'checkin', 
            plan.order_id, 
            f"Check-in reward for Period {plan.current_period}"
        )
        plan.total_earned += reward_amount

    def settle_final_reward(self, plan: CheckinPlan):
        """
        1.3 555天强制结算 (Final Settlement)
        补偿公式: 奖励 = (当前期已连续天数 / 30) * 5% * 奖励基数
        """
        if plan.status != 'active_checkin':
            return
        
        # Compensation for the final uncompleted period
        reward_amount = (Decimal(plan.consecutive_days) / Decimal('30')) * Decimal('0.05') * plan.reward_base
        if reward_amount > 0:
            self.update_wallet_balance(
                plan.user_id, 
                reward_amount, 
                'checkin', 
                plan.order_id, 
                f"Final 555-day settlement reward (Days: {plan.consecutive_days}/30)"
            )
            plan.total_earned += reward_amount
        
        plan.status = 'completed'
        self.db.commit()

    # --- Group-buy Logic ---

    def create_group_buy(self, customer_id: int, order_id: int) -> dict:
        """
        TC-05: User chooses group-buy mode.
        """
        # 1. Update CheckinPlan status
        plan = self.db.query(CheckinPlan).filter_by(order_id=order_id, user_id=customer_id).first()
        if not plan:
            return {"status": "error", "message": "No plan found for this order."}
        
        plan.status = 'active_groupbuy'
        
        # 2. Create GroupBuyCampaign
        share_code = f"GB-{customer_id}-{order_id}" # Simple logic for now
        campaign = GroupBuyCampaign(
            owner_order_id=order_id,
            share_code=share_code,
            required_count=3,
            current_count=0,
            status='open'
        )
        self.db.add(campaign)
        self.db.commit()
        return {"status": "success", "share_code": share_code}

    def process_group_buy_referral(self, share_code: str, new_order_id: int):
        """
        TC-06: 3rd referral order achieved.
        """
        campaign = self.db.query(GroupBuyCampaign).filter_by(share_code=share_code, status='open').first()
        if not campaign:
            return

        campaign.current_count += 1
        if campaign.current_count >= campaign.required_count:
            campaign.status = 'success'
            # Trigger 100% cashback for owner
            plan = self.db.query(CheckinPlan).filter_by(order_id=campaign.owner_order_id).first()
            if plan:
                plan.status = 'completed'
                cashback_amount = plan.reward_base
                self.update_wallet_balance(plan.user_id, cashback_amount, 'group_buy', plan.order_id, "Group-buy 100% cashback success!")
        
        self.db.commit()

    # --- Referral & Wallet ---

    def update_wallet_balance(self, customer_id: int, amount: Decimal, type: str, order_id: Optional[int] = None, description: str = ""):
        """
        TC-11: Negative balance handling.
        """
        wallet = self.db.query(Wallet).filter_by(user_id=customer_id).first()
        if not wallet:
            wallet = Wallet(user_id=customer_id, balance_available=Decimal('0.0'), balance_locked=Decimal('0.0'))
            self.db.add(wallet)
        
        wallet.balance_available += amount
        
        # Record transaction
        tx = WalletTransaction(
            user_id=customer_id,
            amount=amount,
            type=type,
            status='completed',
            order_id=order_id,
            description=description
        )
        self.db.add(tx)
        self.db.commit()
        
        # TC-12: Sync to Shopify Metafields (Needs write_customers permission)
        # self.sync_wallet_to_shopify(customer_id, wallet.balance_available)

    def sync_wallet_to_shopify(self, customer_id: int, balance: Decimal):
        """
        TC-12: Sync wallet balance to Shopify Customer Metafields.
        Requires write_customers permission.
        """
        try:
            import shopify
            from backend.app.services.sync_shopify import SyncShopifyService
            
            # Re-activate session
            sync_service = SyncShopifyService()
            customer = shopify.Customer.find(customer_id)
            if customer:
                customer.add_metafield(shopify.Metafield({
                    "namespace": "0buck_rewards",
                    "key": "wallet_balance",
                    "value": str(balance),
                    "type": "number_decimal"
                }))
            sync_service.close_session()
        except Exception as e:
            print(f"Failed to sync wallet to Shopify for customer {customer_id}: {e}")

    def sync_customer_data_to_shopify(self, customer_id: int):
        """
        Sync all customer related data (balance, level, referral code) to Shopify Metafields.
        """
        summary = self.get_wallet_summary(customer_id)
        level_info = self.get_user_level(customer_id)
        user_ext = self.db.query(UserExt).filter_by(customer_id=customer_id).first()
        
        balance = Decimal(str(summary["available"]))
        
        try:
            import shopify
            from backend.app.services.sync_shopify import SyncShopifyService
            
            sync_service = SyncShopifyService()
            customer = shopify.Customer.find(customer_id)
            if customer:
                # 1. Sync Balance
                customer.add_metafield(shopify.Metafield({
                    "namespace": "0buck_rewards",
                    "key": "wallet_balance",
                    "value": str(balance),
                    "type": "number_decimal"
                }))
                
                # 2. Sync Level
                customer.add_metafield(shopify.Metafield({
                    "namespace": "0buck_rewards",
                    "key": "user_level",
                    "value": level_info["level"],
                    "type": "single_line_text_field"
                }))
                
                # 3. Sync Referral Code
                if user_ext and user_ext.referral_code:
                    customer.add_metafield(shopify.Metafield({
                        "namespace": "0buck_rewards",
                        "key": "referral_code",
                        "value": user_ext.referral_code,
                        "type": "single_line_text_field"
                    }))
                
                print(f"Successfully synced all data to Shopify for customer {customer_id}")
            sync_service.close_session()
            return True
        except Exception as e:
            print(f"Failed to sync customer data to Shopify for {customer_id}: {e}")
            return False

    def get_wallet_summary(self, customer_id: int) -> dict:
        wallet = self.db.query(Wallet).filter_by(user_id=customer_id).first()
        if not wallet:
            return {"available": 0.0, "locked": 0.0}
        
        return {
            "available": float(wallet.balance_available),
            "locked": float(wallet.balance_locked),
            "currency": wallet.currency
        }

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
                "created_at": tx.created_at.isoformat(),
                "description": tx.description
            } for tx in txs
        ]
