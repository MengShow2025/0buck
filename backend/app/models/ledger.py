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
    user_tier = Column(String, default="silver") # 'silver', 'gold', 'platinum'
    kol_status = Column(String, default="none") # 'none', 'pending', 'approved', 'rejected'
    
    # Custom rates (if null, use tier defaults)
    dist_rate = Column(Numeric(5, 4), nullable=True) 
    fan_rate = Column(Numeric(5, 4), nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

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
    status = Column(String, default="pending_choice") # 'pending_choice', 'active_checkin', 'active_groupbuy', 'completed', 'free_refunded', 'forfeited'
    total_earned = Column(Numeric(12, 2), default=0.0)
    last_checkin_at = Column(Date, nullable=True)
    timezone = Column(String(50), default="UTC") # Added timezone field
    plan_config = Column(JSON, nullable=True) # v3.0: Stores the randomized 20-phase roadmap

class CheckinLog(Base):
    __tablename__ = "checkin_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
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
    created_at = Column(DateTime, default=func.now())

class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True) # e.g. "excluded_reward_categories"
    value = Column(JSON) # e.g. ["Promotion", "Special Offer"]
    description = Column(String)
    version = Column(Integer, default=1) # v3.1: Incremented on update for hot-reload
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class UserStreamIdentity(Base):
    """
    v3.4 VCC: Mapping between 0Buck User and Stream Chat Identity.
    """
    __tablename__ = "user_stream_identities"
    id = Column(Integer, primary_key=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id", ondelete="CASCADE"), unique=True)
    stream_token = Column(String(512))
    last_synced_at = Column(DateTime, default=func.now())

class ProcessedWebhookEvent(Base):
    """
    v3.4 VCC: Generic Idempotency table for all incoming webhooks.
    """
    __tablename__ = "processed_webhook_events"

    event_id = Column(String(100), primary_key=True) # Unique ID from provider (msg_id, order_id, etc.)
    provider = Column(String(50), index=True) # 'stream', 'shopify', 'whatsapp'
    processed_at = Column(DateTime, default=func.now())

class AISession(Base):
    __tablename__ = "ai_sessions"

    session_id = Column(String, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=True)
    metadata_json = Column(JSON, default={})
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Order(Base):
    """
    Local order state cache, extending Shopify's basic info for our operational needs.
    """
    __tablename__ = "orders"

    shopify_order_id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    order_number = Column(String, unique=True, index=True)
    total_price = Column(Numeric(12, 2))
    currency = Column(String(10), default="USD")
    
    # Fulfillment Tracking
    tracking_number = Column(String, nullable=True)
    fulfillment_status = Column(String, default="unfulfilled") # 'unfulfilled', 'partial', 'fulfilled', 'restocked'
    
    # Lifecycle Status
    status = Column(String, default="paid") # 'paid', 'shipped', 'completed', 'refunded', 'cancelled'
    review_status = Column(Boolean, default=False)

    # Automated Refund (Group Free)
    refund_status = Column(String, default="none") # 'none', 'pending', 'refunded', 'refund_retry_needed', 'failed'
    refund_txn_id = Column(String, nullable=True) # Shopify refund transaction ID
    refund_error = Column(JSON, nullable=True) # Last refund error payload
    refund_attempts = Column(Integer, default=0)
    last_refund_attempt_at = Column(DateTime, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    
    # v3.1 Discount & Finance Tracking
    discount_code = Column(String(50), nullable=True)
    discount_amount = Column(Numeric(12, 2), default=0.0)
    cogs_total = Column(Numeric(12, 2), default=0.0) # Total 1688 cost for this order

class AvailableCoupon(Base):
    """
    v3.1 Shopify Coupon Sync Table.
    """
    __tablename__ = "available_coupons"

    code = Column(String(50), primary_key=True)
    type = Column(String(20)) # 'fixed_amount', 'percentage', 'free_shipping'
    value = Column(Float)
    min_requirement = Column(Float, default=0.0)
    ai_category = Column(String(50), nullable=True) # 'SERVICE_RECOVERY', 'UPSELL', etc.
    ai_issuance_permission = Column(String(20), default="LOW") # 'LOW', 'MEDIUM', 'HIGH'
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class CouponIssuanceAudit(Base):
    """
    v3.2 Dispute Defense System: Evidence Package for AI-issued coupons.
    Records the 'fingerprint' of the issuance process for manual audit or dispute resolution.
    """
    __tablename__ = "coupon_issuance_audits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    coupon_code = Column(String(50), index=True)
    
    # Evidence Data
    reason = Column(String, nullable=False) # Why AI issued this (e.g., 'LOGISTICS_RECOVERY')
    ai_category = Column(String(50)) # 'SERVICE_RECOVERY', etc.
    context_snapshot = Column(JSON, nullable=True) # Last 3 messages + cart state
    
    # Fingerprint
    model_id = Column(String(50), default="gemini-1.5-pro")
    fingerprint = Column(String(100), unique=True) # Combined hash of user/code/time
    
    issued_at = Column(DateTime, default=func.now())

class SourcingOrder(Base):
    """
    v3.0 Tracking for B2B procurement orders from 1688.
    """
    __tablename__ = "sourcing_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(BigInteger, ForeignKey("orders.shopify_order_id"), index=True)
    product_id_1688 = Column(String, index=True)
    source_order_id = Column(String, unique=True, index=True)
    status = Column(String, default="pending") # 'pending_admin_approval', 'auto_ordered', 'fulfilled', 'failed'
    auto_fulfill = Column(Boolean, default=False)
    cost_cny = Column(Numeric(12, 2))
    error_log = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class SquareActivity(Base):
    """
    Feed for 'The Square' (Social activities).
    """
    __tablename__ = "square_activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True, nullable=True) # System posts use NULL or 0
    type = Column(String) # 'order_paid', 'checkin_streak', 'groupbuy_success', 'admin_announcement'
    content = Column(String)
    metadata_json = Column(JSON, default={}) # Associated IDs, names, etc.
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())

class Comment(Base):
    """
    General purpose comment system for activities and products.
    """
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_id = Column(UUID(as_uuid=True), index=True) # Activity ID or Product UUID
    target_type = Column(String) # 'activity', 'product'
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    content = Column(String)
    created_at = Column(DateTime, default=func.now())
