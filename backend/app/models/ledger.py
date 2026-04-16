from sqlalchemy import Column, Integer, BigInteger, String, Float, DateTime, JSON, ForeignKey, Boolean, Enum, Numeric, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from .product import Base

class UserExt(Base):
    __tablename__ = "users_ext"

    customer_id = Column(BigInteger, primary_key=True, index=True) # Shopify Customer ID
    inviter_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=True)
    email = Column(String(255), unique=True, index=True)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    referral_code = Column(String(20), unique=True, index=True)
    user_type = Column(String, default="customer") # 'customer', 'kol'
    user_tier = Column(String, default="silver") # 'silver', 'gold', 'platinum'
    kol_status = Column(String, default="none") # 'none', 'pending', 'approved', 'rejected'
    kol_apply_reason = Column(String, nullable=True) # v4.6.8: Application context
    kol_applied_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    # v3.4.6: Google 2FA
    two_factor_secret = Column(String(32), nullable=True)
    is_two_factor_enabled = Column(Boolean, default=False)
    
    # v5.5: Backup Recovery Email (Alternative to Phone)
    backup_email = Column(String(255), nullable=True, index=True)
    
    # v3.8.0: Payment Security
    hashed_payment_password = Column(String, nullable=True)
    payment_pass_failed_attempts = Column(Integer, default=0)
    payment_pass_locked_until = Column(DateTime, nullable=True)
    last_login_ip = Column(String, nullable=True) # v3.8.2: Security Tracking
    last_login_at = Column(DateTime, nullable=True)
    
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
    
    # v4.0: Points/PTS Tracking (Compute Engine)
    pts_balance = Column(Integer, default=0)
    pts_total_earned = Column(Integer, default=0)
    pts_last_updated = Column(DateTime, default=func.now())
    
    currency = Column(String(10), default="USD")

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    amount = Column(Numeric(12, 2))
    
    # v4.0: Expanded Types for Double-Entry alignment
    # 'checkin', 'referral', 'fan_bonus', 'group_buy', 'withdrawal', 'withdrawal_freeze', 'refund', 'c2w_refund'
    type = Column(String) 
    
    status = Column(String, default="pending") # 'pending', 'completed', 'failed', 'cancelled'
    order_id = Column(BigInteger, nullable=True)
    reference_id = Column(String(100), nullable=True) # External ref (Shopify/PayPal txn)
    description = Column(String)
    
    # v4.0: Accounting metadata
    metadata_json = Column(JSON, nullable=True) # { "debit_account": "user_wallet", "credit_account": "platform_pool" }
    
    created_at = Column(DateTime, default=func.now())

class WithdrawalRequest(Base):
    """
    v4.6.8: Payout lifecycle for 'Cash Out' operations.
    Supports PayPal, Bank Transfer, and USDT (Crypto).
    """
    __tablename__ = "withdrawal_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    fee = Column(Numeric(12, 2), default=0.0)
    
    # Destination Details
    method = Column(String(20), nullable=False) # 'PayPal', 'Bank', 'USDT'
    destination_address = Column(String(255), nullable=False) # Email, IBAN, Wallet Address
    destination_metadata = Column(JSON, nullable=True) # { "bank_name": "...", "account_holder": "..." }
    
    # Status Flow
    # 'pending', 'processing', 'paid', 'rejected', 'failed', 'cancelled'
    status = Column(String(20), default="pending", index=True)
    
    # Provider Info
    provider_ref = Column(String(100), nullable=True) # e.g. PayPal Payout Batch ID
    error_log = Column(JSON, nullable=True)
    
    # Audit Trail
    processed_at = Column(DateTime, nullable=True)
    processed_by = Column(BigInteger, nullable=True) # Admin ID
    rejection_reason = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class UserPayoutAccount(Base):
    """
    v4.6.8: Saved payout accounts for users.
    """
    __tablename__ = "user_payout_accounts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    
    method = Column(String(20), nullable=False) # 'PayPal', 'Bank', 'USDT'
    account_address = Column(String(255), nullable=False) # Email, IBAN, Wallet Address
    metadata_json = Column(JSON, nullable=True) # { "bank_name": "...", "account_holder": "..." }
    
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class PTSHistory(Base):
    """
    v4.0: High-fidelity tracking for Points (PTS).
    Used for AI Dehydration & User DNA profiling.
    """
    __tablename__ = "pts_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    delta = Column(Integer, nullable=False) # e.g. +10, -500
    source = Column(String) # 'sign_in', 'byok_reward', 'review', 'rescue_card', 'level_up'
    balance_snapshot = Column(Integer)
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
    last_checkin_utc = Column(DateTime, nullable=True) # v3.5.0: For 20h cooldown defense
    payout_eligible_at = Column(DateTime, nullable=True) # Fulfillment + Return Period
    timezone = Column(String(50), default="UTC")
    plan_config = Column(JSON, nullable=True) # v3.0: Stores the randomized 20-phase roadmap
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class CheckinLog(Base):
    __tablename__ = "checkin_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("checkin_plans.id"), index=True)
    checkin_date = Column(Date, default=func.current_date())
    period_num = Column(Integer)
    day_num = Column(Integer)

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(BigInteger, index=True)
    action = Column(String(100)) # e.g. 'APPROVE_KOL', 'VERDICT_FRAUD'
    target_id = Column(String(100), nullable=True) # ID of the resource affected
    payload = Column(JSON, nullable=True) # Data sent in request
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())

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
    owner_order_id = Column(BigInteger, index=True) # Changed from unique=True to support multiple items per order
    product_id = Column(BigInteger, nullable=True) # Shopify Product ID
    variant_id = Column(BigInteger, nullable=True) # Shopify Variant ID
    purchased_quantity = Column(Integer, default=1) # Total quantity purchased
    refunded_quantity = Column(Integer, default=0) # Number of items already refunded/freed
    share_code = Column(String(20), unique=True, index=True)
    required_count = Column(Integer, default=3) # quantity * 3
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
    user_id = Column(String, index=True, nullable=True) # v3.4: Changed to String to support Guest IDs
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
    delivered_at = Column(DateTime, nullable=True) # Actual signing/delivery date
    
    # Lifecycle Status
    status = Column(String, default="paid") # 'paid', 'shipped', 'completed', 'refunded', 'cancelled'
    review_status = Column(Boolean, default=False)
    
    # v4.0: Referral Tracking (Direct Referral Reward)
    referrer_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=True, index=True)
    referral_reward_status = Column(String, default="pending") # 'pending', 'settled', 'cancelled'

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

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

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
    model_id = Column(String(50), default="gemini-2.5-flash")
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

class PriceWish(Base):
    __tablename__ = "price_wishes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, index=True)
    product_id = Column(BigInteger, index=True)
    wish_price = Column(Numeric(12, 2))
    status = Column(String, default="active") # active, fulfilled, cancelled
    created_at = Column(DateTime, default=func.now())
    notified_at = Column(DateTime, nullable=True)

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


class PromoShareLink(Base):
    """
    Share-link issuance record for bot promo cards.
    Immutable attribution payload is bound to share_token.
    """
    __tablename__ = "promo_share_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    share_token = Column(String(255), unique=True, index=True, nullable=False)
    sharer_user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True, nullable=False)

    share_category = Column(String(30), nullable=False)  # group_buy | distribution | fan_source
    card_type = Column(String(20), nullable=False)       # product | merchant | invite
    target_type = Column(String(20), nullable=False)     # product | merchant | none
    target_id = Column(String(64), nullable=True)

    platform = Column(String(20), nullable=True)         # feishu/telegram/whatsapp/discord
    entry_type = Column(String(50), nullable=True)       # user-selected source lane
    policy_version = Column(String(20), default="v1")
    source_code = Column(String(40), nullable=True)      # optional existing referral/share code bridge
    status = Column(String(20), default="active")        # active | expired | revoked
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())


class OrderAttribution(Base):
    """
    One immutable attribution snapshot per order.
    """
    __tablename__ = "order_attributions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(BigInteger, ForeignKey("orders.shopify_order_id"), unique=True, index=True, nullable=False)
    share_token = Column(String(255), index=True, nullable=False)
    sharer_user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True, nullable=False)

    share_category = Column(String(30), nullable=False)
    card_type = Column(String(20), nullable=False)
    target_type = Column(String(20), nullable=False)
    target_id = Column(String(64), nullable=True)
    entry_type = Column(String(50), nullable=True)
    policy_version = Column(String(20), default="v1")
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
