from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, JSON, ForeignKey, Boolean, Enum, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from .product import Base

class UserExt(Base):
    __tablename__ = "users_ext"

    customer_id = Column(BigInteger, primary_key=True, index=True) # Shopify Customer ID
    inviter_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=True)
    referral_code = Column(String(20), unique=True, index=True)
    user_type = Column(String, default="customer") # 'customer', 'kol'
    kol_status = Column(String, default="pending") # 'pending', 'approved', 'rejected'
    kol_one_time_rate = Column(Numeric(5, 2), default=0.0)
    kol_long_term_rate = Column(Numeric(5, 2), default=0.0)
    created_at = Column(DateTime, default=func.now())

class Wallet(Base):
    __tablename__ = "wallets"

    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), primary_key=True)
    balance_available = Column(Numeric(12, 2), default=0.0)
    balance_locked = Column(Numeric(12, 2), default=0.0)
    currency = Column(String(10), default="USD")

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    amount = Column(Numeric(12, 2))
    type = Column(String) # 'checkin', 'referral', 'group_buy', 'withdrawal', 'refund'
    status = Column(String, default="pending") # 'pending', 'completed', 'failed'
    order_id = Column(BigInteger, nullable=True)
    description = Column(String)
    created_at = Column(DateTime, default=func.now())

class CheckinPlan(Base):
    __tablename__ = "checkin_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    order_id = Column(BigInteger, unique=True, index=True)
    reward_base = Column(Numeric(12, 2))
    confirmed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    current_period = Column(Integer, default=1)
    consecutive_days = Column(Integer, default=0)
    status = Column(String, default="pending_choice") # 'pending_choice', 'active_checkin', 'active_groupbuy', 'completed', 'forfeited'
    total_earned = Column(Numeric(12, 2), default=0.0)
    last_checkin_at = Column(Date, nullable=True)
    timezone = Column(String(50), default="UTC") # Added timezone field

class CheckinLog(Base):
    __tablename__ = "checkin_logs"

    id = Column(BigInteger, primary_key=True, index=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("checkin_plans.id"), index=True)
    checkin_date = Column(Date, default=func.current_date())
    period_num = Column(Integer)
    day_num = Column(Integer)

class ReferralRelationship(Base):
    __tablename__ = "referral_relationships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inviter_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    invitee_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    start_at = Column(DateTime, default=func.now())
    expire_at = Column(DateTime)

class GroupBuyCampaign(Base):
    __tablename__ = "group_buy_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_order_id = Column(BigInteger, unique=True, index=True)
    share_code = Column(String(20), unique=True, index=True)
    required_count = Column(Integer, default=3)
    current_count = Column(Integer, default=0)
    status = Column(String, default="open") # 'open', 'success', 'expired'
