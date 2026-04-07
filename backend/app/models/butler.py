from sqlalchemy import Column, Integer, BigInteger, String, JSON, ForeignKey, DateTime, Float, Numeric, Boolean, UniqueConstraint
from sqlalchemy.sql import func
from .product import Base

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None

class PersonaTemplate(Base):
    """
    v3.2 L2 Strategy Layer: Predefined persona templates.
    Managed by Admin.
    """
    __tablename__ = "persona_templates"
    
    id = Column(String(50), primary_key=True) # e.g., 'cute_loli', 'rigorous_expert'
    name = Column(String(100), nullable=False)
    style_prompt = Column(String, nullable=False) # The specific L2 personality prompt
    
    # Quantified Vectors for fine-tuning
    empathy_weight = Column(Float, default=0.5)
    formality_score = Column(Float, default=0.5)
    vibrancy_level = Column(Float, default=0.5)
    emoji_density = Column(Float, default=0.5)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class UserIMBinding(Base):
    """
    v5.5: Maps external IM identities (Feishu, WhatsApp, Telegram) to 0Buck Customer IDs.
    Ensures secure, cross-platform persona & memory continuity.
    """
    __tablename__ = "user_im_bindings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), nullable=False)
    platform = Column(String(50), nullable=False) # 'feishu', 'whatsapp', 'telegram'
    platform_uid = Column(String(255), nullable=False, index=True) # OpenID, Phone, etc.
    extra_data = Column(JSON, nullable=True) # Metadata like display name, avatar
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (UniqueConstraint('platform', 'platform_uid', name='_platform_uid_uc'),)

class UserButlerProfile(Base):
    """
    Stores the AI Butler's personality and the user's affinity score.
    v3.2: Linked to active_persona_id.
    """
    __tablename__ = "user_butler_profiles"
    
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), primary_key=True)
    butler_name = Column(String(100), nullable=True) # The name the user gave the Butler
    active_persona_id = Column(String(50), ForeignKey("persona_templates.id"), default="default")
    
    affinity_score = Column(Integer, default=0) # 0-100 好感度
    current_vibe = Column(String(50), nullable=True) # Current emotional connection state
    detected_country = Column(String(10), nullable=True) # ISO Country code from IP
    preferred_currency = Column(String(10), default="USD") # Local currency for pricing
    
    # v3.2: User-specific overrides for Persona Sliders
    custom_vectors = Column(JSON, default={}) # e.g., {"empathy": 0.8}
    
    personality = Column(JSON, default={}) # AI personality filters/preferences
    ai_api_key = Column(String(255), nullable=True) # Encrypted User API Key (BYOK)
    
    # v3.1 AI Butler Industrial Enhancements
    byok_status = Column(String(20), default="none") # 'active', 'failed', 'none'
    last_health_check = Column(DateTime, nullable=True)
    
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class AIUsageStats(Base):
    """
    v3.2 Token Economics Tracking.
    """
    __tablename__ = "ai_usage_stats"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    date = Column(DateTime, default=func.now(), index=True)
    
    task_type = Column(String(20)) # 'chat', 'reflection', 'sourcing'
    model_name = Column(String(50)) # 'gemini-1.5-pro', 'gemini-1.5-flash'
    
    tokens_in = Column(Integer, default=0)
    tokens_out = Column(Integer, default=0)
    cost_usd = Column(Numeric(12, 6), default=0.0)
    
    session_id = Column(String(100), nullable=True)

class AIContribution(Base):
    """
    v3.1 Tracks tokens saved by users using BYOK and reward fragments.
    """
    __tablename__ = "user_ai_contributions"
    
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), primary_key=True)
    tokens_saved = Column(BigInteger, default=0)
    usd_saved = Column(Numeric(12, 4), default=0.0) # Accuracy for token value
    reward_shards = Column(Integer, default=0) # Card shards (3 shards = 1 card)
    total_rewards_given = Column(Integer, default=0)
    last_updated = Column(DateTime, default=func.now(), onupdate=func.now())

class ShadowIDMapping(Base):
    """
    v3.1 Zone 2 Shadow ID mappings for physical data isolation.
    """
    __tablename__ = "shadow_id_mappings"
    
    shadow_id = Column(String(50), primary_key=True) # e.g., 'SH_PROD_A1'
    real_id = Column(String(100), index=True) # 1688 ID or Internal Product ID
    context_type = Column(String(20)) # 'product', 'supplier', 'order'
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

class UserMemoryFact(Base):
    """
    Stores structured 'hard facts' extracted from conversations.
    v3.2: Added source_message_id and metadata for conflict resolution.
    """
    __tablename__ = "user_memory_facts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    
    key = Column(String(100), nullable=False) # e.g., 'pet_name', 'aesthetic_pref'
    value = Column(JSON, nullable=False)
    
    confidence = Column(Float, default=1.0) # 0.0 - 1.0
    source_message_id = Column(String(100), nullable=True) # For evidence back-tracing
    
    is_archived = Column(Boolean, default=False) # For decay/conflict resolution
    last_verified_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())

class UserMemorySemantic(Base):
    """
    Stores conversational fragments for semantic search (Long-term memory).
    """
    __tablename__ = "user_memory_semantics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users_ext.customer_id"), index=True)
    content = Column(String, nullable=False)
    if Vector:
        embedding = Column(Vector(1536)) # For Gemini/OpenAI embeddings
    else:
        embedding = Column(JSON, nullable=True)
    tags = Column(JSON, default=[]) # e.g., #tired, #gift_ideas
    created_at = Column(DateTime, default=func.now())
