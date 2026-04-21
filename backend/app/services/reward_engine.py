
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.butler import AIContribution
from app.models.rewards import Points, PointTransaction, PointSource
from app.services.config_service import ConfigService

class RewardEngine:
    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)

    def track_token_usage(self, user_id: int, tokens: int, model_type: str = "flash"):
        """
        Track token usage and award point rewards for BYOK users.
        Atomic Update: Uses with_for_update() to prevent double-spending in concurrent tasks.
        """
        # Standard: each threshold of saved USD grants fixed points.
        reward_threshold = Decimal(str(self.config_service.get("BYOK_REWARD_THRESHOLD_USD", 50.0)))
        reward_points = int(self.config_service.get("BYOK_REWARD_POINTS_PER_THRESHOLD", 100))
        
        # Token Pricing (Simulated market value)
        token_price_per_1m = Decimal("1.00") if model_type == "flash" else Decimal("15.00")
        usd_saved = (Decimal(str(tokens)) / Decimal("1000000")) * token_price_per_1m
        
        # Lock the row for this user
        try:
            contribution = self.db.query(AIContribution).filter_by(user_id=user_id).with_for_update().first()
            if not contribution:
                contribution = AIContribution(user_id=user_id, tokens_saved=0, usd_saved=Decimal("0.0"), reward_shards=0, total_rewards_given=0)
                self.db.add(contribution)
                self.db.commit()
                contribution = self.db.query(AIContribution).filter_by(user_id=user_id).with_for_update().first()
        except IntegrityError:
            self.db.rollback()
            contribution = self.db.query(AIContribution).filter_by(user_id=user_id).with_for_update().first()
            
        contribution.tokens_saved = (contribution.tokens_saved or 0) + tokens
        contribution.usd_saved = (contribution.usd_saved or Decimal("0.0")) + usd_saved
        
        # 3. Award points by milestone (reward_threshold USD-saved per milestone)
        milestones_earned = int(contribution.usd_saved / reward_threshold) if reward_threshold > 0 else 0
        milestones_awarded = contribution.total_rewards_given or 0
        new_milestones = max(0, milestones_earned - milestones_awarded)

        if new_milestones > 0 and reward_points > 0:
            points_delta = new_milestones * reward_points
            points = self.db.query(Points).filter_by(user_id=user_id).with_for_update().first()
            if not points:
                points = Points(user_id=user_id, balance=0, total_earned=0)
                self.db.add(points)
                self.db.flush()

            points.balance = (points.balance or 0) + points_delta
            points.total_earned = (points.total_earned or 0) + points_delta

            txn = PointTransaction(
                user_id=user_id,
                amount=points_delta,
                source=PointSource.TASK,
                description=f"BYOK contribution reward x{new_milestones}",
                created_at=datetime.utcnow(),
            )
            self.db.add(txn)
            contribution.total_rewards_given = milestones_awarded + new_milestones

        # Keep shard progress for optional UI progress display (0-2)
        if reward_threshold > 0:
            progress = (contribution.usd_saved % reward_threshold) / reward_threshold
            contribution.reward_shards = min(2, int(progress * 3))
                
        self.db.commit()
        return contribution
