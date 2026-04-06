from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id_1688 = Column(String, unique=True, index=True)
    name = Column(String)
    rating = Column(Float)
    location_province = Column(String)
    location_city = Column(String)
    warehouse_anchor = Column(String) # Assigned warehouse (closest one)
    
    # v3.0 Supplier Audit (Reliability Gate)
    is_strength_merchant = Column(Boolean, default=False) # 实力商家
    can_dropship = Column(Boolean, default=True)         # 1件代发
    ships_within_48h = Column(Boolean, default=True)      # 48小时内发货
    has_bad_reviews_30d = Column(Boolean, default=False)  # 近30天无大量差评
    
    qualifications = Column(JSON)  # CE, ISO, etc.
    
    # v3.3.1 C2M: Customization Capabilities
    # Format: {"laser_engraving": true, "packaging": true, "min_order_custom": 10}
    custom_capability = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_id_1688 = Column(String, unique=True, index=True)
    shopify_product_id = Column(String, unique=True, index=True, nullable=True)
    shopify_variant_id = Column(String, unique=True, index=True, nullable=True)
    
    # Internationalization Support (Dynamic JSON for extensible locales)
    # Format: {"en": "Title", "zh": "标题", "es": "Título", ...}
    titles = Column(JSON, default={})
    descriptions = Column(JSON, default={})
    
    # Legacy fields (keep for fallback)
    title_zh = Column(String)
    title_en = Column(String)
    description_zh = Column(String)
    description_en = Column(String)
    
    original_price = Column(Float)  # 1688 cost in CNY
    source_cost_usd = Column(Float) # Buffered cost in USD (0.5% buffer applied)
    sale_price = Column(Float)      # Final price in USD (60% of competitor)
    compare_at_price = Column(Float) # Display price in USD (95% of competitor)
    
    images = Column(JSON)           # List of image URLs
    variants = Column(JSON)         # SKU options
    
    category = Column(String)
    tags = Column(JSON)
    weight = Column(Float, default=0.5) # Default 0.5kg (grams: 500)
    is_taxable = Column(Boolean, default=True)
    
    # v3.1.5 Professional Meta-Sync Extensions
    media = Column(JSON, default=list) # Full list of image/video URLs
    certificate_images = Column(JSON, default=list) # v3.1: Certificates/Legal images
    variants_data = Column(JSON, default=list) # Structured multi-variants (options, prices, weights)
    metafields = Column(JSON, default=dict) # Complex attributes (CE, Materials, etc.)
    origin_video_url = Column(String)
    
    # v3.1 Industrial-grade Enhancements
    strategy_tag = Column(String, index=True) # 'IDS_FOLLOWING', 'IDS_SPY', 'IDS_VECTOR'
    is_melted = Column(Boolean, default=False)
    melting_reason = Column(String, nullable=True)
    melted_at = Column(DateTime, nullable=True) # Timestamp of the melt event

    # v4.0: Desire Engine Snippets
    desire_hook = Column(String, nullable=True)
    desire_logic = Column(String, nullable=True)
    desire_closing = Column(String, nullable=True)
    last_stable_cost = Column(Float, nullable=True) # Cost before melting
    price_fluctuation_threshold = Column(Float, default=0.15)
    scan_priority = Column(Integer, default=2) # 1: High (Hourly), 2: Med (4h), 3: Low (12h)
    
    # v3.1 Hybrid Growth Model
    is_cashback_eligible = Column(Boolean, default=True) # Traffic vs Profit switch
    product_category_type = Column(String, default="PROFIT") # 'TRAFFIC', 'PROFIT', 'REGULAR'
    
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    
    # v3.0: Backup Suppliers (Top 3 vetted vendors)
    # Format: [{"supplier_id": "...", "name": "...", "price_cny": ...}, ...]
    backup_suppliers = Column(JSON, default=[])
    
    from sqlalchemy.orm import relationship
    supplier = relationship("Supplier")
    
    is_active = Column(Boolean, default=True)
    is_reward_eligible = Column(Boolean, default=True)
    last_synced_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class ProductVector(Base):
    __tablename__ = "product_vectors"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    qdrant_point_id = Column(String, unique=True)
    embedding_model = Column(String) # e.g., SigLIP
    last_updated = Column(DateTime, default=func.now())

class CandidateProduct(Base):
    """
    v3.9.0: Autonomous Sourcing Pipeline - Candidate Stage.
    Status Flow: new -> reviewing -> approved/rejected -> synced (Product)
    """
    __tablename__ = "candidate_products"

    id = Column(Integer, primary_key=True, index=True)
    product_id_1688 = Column(String, unique=True, index=True)
    status = Column(String, default="new", index=True) # 'new', 'reviewing', 'approved', 'rejected', 'synced'
    
    # AI Discovery Proof (The Evidence Chain)
    discovery_source = Column(String) # 'IDS_FOLLOWING', 'IDS_SPY', 'C2M_WISH'
    discovery_evidence = Column(JSON) # { "tiktok_url": "...", "trend_score": 95, "comp_images": ["..."] }
    
    # Raw Sourcing Data
    title_zh = Column(String)
    description_zh = Column(String)
    images = Column(JSON)
    variants_raw = Column(JSON)
    
    # Financial Analysis (Pre-audit)
    cost_cny = Column(Float)
    comp_price_usd = Column(Float)
    estimated_sale_price = Column(Float)
    profit_ratio = Column(Float)
    
    # Supplier Context
    supplier_id_1688 = Column(String)
    supplier_info = Column(JSON) # { "name": "...", "rating": 4.8, "is_strength": true }
    
    # AI Polish Preview (Generated during candidate phase)
    title_en_preview = Column(String, nullable=True)
    description_en_preview = Column(String, nullable=True)
    
    # v4.0: Desire Engine Snippets
    desire_hook = Column(String, nullable=True) # The Hook: Zapping the pain point
    desire_logic = Column(String, nullable=True) # The Logic: Brand tax deconstruction
    desire_closing = Column(String, nullable=True) # The Closing: FOMO & Ritual
    
    # Metadata
    category = Column(String)
    audit_notes = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
