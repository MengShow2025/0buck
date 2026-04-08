from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, ForeignKey, Enum, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum
from .product import Base

class PointSource(enum.Enum):
    SIGN_IN = "SIGN_IN"
    REVIEW = "REVIEW"
    PURCHASE = "PURCHASE"
    TASK = "TASK"
    REFERRAL = "REFERRAL"
    REGISTRATION = "REGISTRATION"

class PointTransaction(Base):
    """
    Tracks all user point earnings and spending (Renewal Cards).
    """
    __tablename__ = "point_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    amount = Column(Integer, nullable=False) # e.g., +10, -3000
    source = Column(Enum(PointSource), nullable=False)
    order_id = Column(BigInteger, nullable=True, index=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())

class RenewalCard(Base):
    """
    Tracks point redemptions for check-in rescue.
    """
    __tablename__ = "renewal_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("checkin_plans.id"), index=True)
    status = Column(String, default="unused") # 'unused', 'used'
    period_num = Column(Integer, nullable=True) # v3.0: Phase for which the card was used
    created_at = Column(DateTime, default=func.now())
    used_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

class AIUsageQuota(Base):
    """
    Monitors daily ($1) and monthly ($10) AI usage for each user.
    """
    __tablename__ = "ai_usage_quotas"

    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), primary_key=True)
    daily_cost_usd = Column(Numeric(10, 4, asdecimal=True), default=0.0)
    monthly_cost_usd = Column(Numeric(10, 4, asdecimal=True), default=0.0)
    last_reset_at = Column(DateTime, default=func.now())

class Points(Base):
    """
    Cached balance for quick display.
    """
    __tablename__ = "points"

    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), primary_key=True)
    balance = Column(Integer, default=0)
    total_earned = Column(Integer, default=0)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
