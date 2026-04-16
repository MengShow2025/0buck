from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, ForeignKey, Boolean, Text, Computed, Index
from sqlalchemy.dialects.postgresql import JSONB
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
    
    qualifications = Column(JSONB, server_default='[]')  # CE, ISO, etc.
    
    # v3.3.1 C2M: Customization Capabilities
    # Format: {"laser_engraving": true, "packaging": true, "min_order_custom": 10}
    custom_capability = Column(JSONB, server_default='{}')
    
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
    titles = Column(JSONB, server_default='{}')
    descriptions = Column(JSONB, server_default='{}')
    
    # Legacy fields (keep for fallback)
    title_zh = Column(String)
    title_en = Column(String)
    description_zh = Column(String)
    description_en = Column(String)
    
    original_price = Column(Float)  # 1688 cost in CNY
    source_cost_usd = Column(Float) # Buffered cost in USD (0.5% buffer applied)
    sale_price = Column(Float)      # Final price in USD
    compare_at_price = Column(Float) # Display price in USD
    
    # v4.6.8: Multi-Platform Comparison Pricing
    amazon_price = Column(Float, nullable=True)
    ebay_price = Column(Float, nullable=True)
    amazon_compare_at_price = Column(Float, nullable=True)
    ebay_compare_at_price = Column(Float, nullable=True)
    
    # v7.0: Truth Engine & Industrial Arbitrage
    amazon_link = Column(String, nullable=True)
    amazon_list_price = Column(Float, nullable=True)
    amazon_sale_price = Column(Float, nullable=True)
    hot_rating = Column(Float, nullable=True)
    profit_ratio = Column(Float, nullable=True)
    
    # v8.0 Advanced Tagging & Classification
    product_category_label = Column(String, index=True) # 'REBATE', 'NORMAL', 'MAGNET'
    admin_tags = Column(JSONB, server_default='[]')    # 'HOT', 'PROMOTION', 'PRE-SALE', 'CROWDFUNDING'
    source_platform_name = Column(String, default='CJ', index=True) # 'CJ', 'ALIBABA', 'ALIEXPRESS', 'WILO', 'SALEYEE'
    
    entry_tag = Column(String, index=True) # 'Promotion', 'Rebate'
    platform_tag = Column(String, default='CJ', index=True)
    
    # v7.0 Circuit Breaker & Alerts
    is_melted = Column(Boolean, default=False, index=True)
    melt_reason = Column(String, nullable=True)
    shipping_ratio = Column(Float, nullable=True)
    shipping_warning = Column(Boolean, default=False)
    
    # CJ Specific Meta (Step 6 / cj_fields_matrix.csv)
    cj_pid = Column(String, index=True)
    category_id = Column(String, index=True)
    category_name = Column(String) # v7.0
    is_test_product = Column(Boolean, default=False)
    
    # Media & Display
    primary_image = Column(String) # v7.0
    variant_images = Column(JSONB, server_default='[]') # v7.0
    detail_images_html = Column(Text) # v7.0
    
    # Pricing
    sell_price = Column(Float) # v7.0 (CJ sellPrice)
    variant_sell_price = Column(Float) # v7.0
    
    # Dimensions & Weight
    dimensions_display = Column(String) # v7.0
    weight_display = Column(String) # v7.0
    packing_weight = Column(Float)
    product_weight = Column(Float)
    
    # Logistics
    freight_fee = Column(Float) # v7.0
    shipping_days = Column(String) # v7.0
    inventory_total = Column(Integer)
    warehouse_anchor = Column(String) # v7.0
    
    # Variants (Explicit v7.0 Fields from Matrix)
    variant_sku = Column(String) # v7.0
    variant_key = Column(String) # v7.0
    
    # Compliance & Props
    entry_code = Column(String)
    entry_name = Column(String)
    product_props = Column(JSONB, server_default='{}')
    
    images = Column(JSONB, server_default='[]')           # List of image URLs (Main Gallery)
    detail_images = Column(JSONB, server_default='[]') # v4.1: Long-page detail images
    variants = Column(JSONB, server_default='[]')         # SKU options
    
    category = Column(String)
    tags = Column(JSONB, server_default='[]')
    weight = Column(Float, default=0.5) # Default 0.5kg (grams: 500)
    is_taxable = Column(Boolean, default=True)
    
    # v4.1: Media & Compliance Assets
    origin_video_url = Column(String, nullable=True)
    certificate_images = Column(JSONB, server_default='[]')
    metafields = Column(JSONB, server_default='{}')
    
    # v4.5 "Artisan-Master" Asset Base
    # Business Tier: Logic & UI
    attributes = Column(JSONB, server_default='[]')
    variants_data = Column(JSONB, server_default='[]')
    logistics_data = Column(JSONB, server_default='{}')
    
    # Asset Tier: Visual & Evidence
    mirror_assets = Column(JSONB, server_default='{}')
    
    # v4.6.7: Visual Fingerprinting for deduplication
    visual_fingerprint = Column(String, index=True, nullable=True) # MD5 of main image
    
    # v7.0 Truth Engine: Vision Audit Columns
    vision_ocr_text = Column(Text, nullable=True)
    vision_audit_passed = Column(Boolean, default=True)
    vision_audit_notes = Column(Text, nullable=True)
    
    # v7.2 Truth Engine: Asset Fingerprint Columns
    source_pid = Column(String, index=True, nullable=True)
    image_fingerprint_md5 = Column(String, index=True, nullable=True)
    asset_lineage_verified = Column(Boolean, default=False)
    source_platform_id = Column(String, nullable=True)
    shopify_product_handle = Column(String, nullable=True)
    
    # Black Box: Evidence, Social Proof, Tier Pricing
    structural_data = Column(JSONB, server_default='{}')
    
    # Computed Index (Generated Columns)
    # repurchase_rate = Column(Float, Computed("(structural_data->'social'->>'repurchase_rate')::float"))
    
    # v4.0: Desire Engine Snippets
    strategy_tag = Column(String, index=True) # 'IDS_FOLLOWING', 'IDS_SPY', 'IDS_VECTOR'
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

# v4.5 GIN Indexes for High-Speed "Bubble Search"
Index('idx_product_attributes', Product.attributes, postgresql_using='gin')
Index('idx_product_variants_data', Product.variants_data, postgresql_using='gin')
Index('idx_product_structural_data', Product.structural_data, postgresql_using='gin')

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
    
    # v4.7.1: Sourcing Provenance & Fixed Mapping
    # '1688' or 'ALIBABA'
    source_platform = Column(String, default='1688', index=True)
    source_url = Column(String) # The hard-mapped direct purchase URL
    backup_source_url = Column(String, nullable=True) # Redundancy link
    
    # v7.0 Truth Engine & Industrial Arbitrage (Industrialized Refinement)
    body_html = Column(Text) # v7.0: Truth UI Placeholder
    title_en = Column(String) # v7.0: Refined English Title
    description_en = Column(Text) # v7.0: Refined English Description
    
    # AI Discovery Proof (The Evidence Chain)
    discovery_source = Column(String) # 'IDS_FOLLOWING', 'IDS_SPY', 'C2M_WISH'
    discovery_evidence = Column(JSONB, server_default='{}') # { "tiktok_url": "...", "trend_score": 95, "comp_images": ["..."] }
    
    # Raw Sourcing Data
    title_zh = Column(String)
    description_zh = Column(String)
    images = Column(JSONB, server_default='[]')
    
    alibaba_comparison_price = Column(Float, nullable=True) # Price on Alibaba.com for comparison
    
    # Financial Analysis (Pre-audit)
    cost_cny = Column(Float)
    comp_price_usd = Column(Float) # Legacy: Combined competitor price
    
    # v4.6.8: Detailed Comparison Metrics
    amazon_price = Column(Float, nullable=True)
    ebay_price = Column(Float, nullable=True)
    amazon_compare_at_price = Column(Float, nullable=True)
    ebay_compare_at_price = Column(Float, nullable=True)
    market_comparison_url = Column(String, nullable=True)
    
    # v7.0: Truth Engine & Industrial Arbitrage
    amazon_link = Column(String, nullable=True)
    amazon_list_price = Column(Float, nullable=True)
    amazon_sale_price = Column(Float, nullable=True)
    hot_rating = Column(Float, nullable=True)
    profit_ratio = Column(Float, nullable=True)
    
    # v8.0 Advanced Tagging & Classification
    product_category_label = Column(String, index=True) # 'REBATE', 'NORMAL', 'MAGNET'
    admin_tags = Column(JSONB, server_default='[]')    # 'HOT', 'PROMOTION', 'PRE-SALE', 'CROWDFUNDING'
    source_platform_name = Column(String, default='CJ', index=True) # 'CJ', 'ALIBABA', 'ALIEXPRESS', 'WILO', 'SALEYEE'
    
    entry_tag = Column(String, index=True) # 'Promotion', 'Rebate'
    platform_tag = Column(String, default='CJ', index=True)
    
    # v7.0 Circuit Breaker & Alerts
    is_melted = Column(Boolean, default=False, index=True)
    melt_reason = Column(String, nullable=True)
    shipping_ratio = Column(Float, nullable=True)
    shipping_warning = Column(Boolean, default=False)
    
    # CJ Specific Meta (Step 6 / cj_fields_matrix.csv)
    cj_pid = Column(String, index=True)
    category_id = Column(String, index=True)
    category_name = Column(String) # v7.0
    is_test_product = Column(Boolean, default=False)
    
    # Media & Display
    primary_image = Column(String) # v7.0
    variant_images = Column(JSONB, server_default='[]') # v7.0
    detail_images_html = Column(Text) # v7.0
    
    # Pricing
    sell_price = Column(Float) # v7.0 (CJ sellPrice)
    variant_sell_price = Column(Float) # v7.0
    
    # Dimensions & Weight
    dimensions_display = Column(String) # v7.0
    weight_display = Column(String) # v7.0
    packing_weight = Column(Float)
    product_weight = Column(Float)
    
    # Logistics
    freight_fee = Column(Float) # v7.0
    shipping_days = Column(String) # v7.0
    inventory_total = Column(Integer)
    warehouse_anchor = Column(String) # v7.0
    
    # Variants (Explicit v7.0 Fields from Matrix)
    variant_sku = Column(String) # v7.0
    variant_key = Column(String) # v7.0
    
    # Compliance & Props
    entry_code = Column(String)
    entry_name = Column(String)
    product_props = Column(JSONB, server_default='{}')
    
    # Supplier Context
    supplier_id_cj = Column(String)
    supplier_name = Column(String)
    vendor_rating = Column(Float)
    
    estimated_sale_price = Column(Float)
    
    # Supplier Context
    supplier_id_1688 = Column(String)
    supplier_info = Column(JSONB, server_default='{}') # { "name": "...", "rating": 4.8, "is_strength": true }
    
    # AI Polish Preview (Generated during candidate phase)
    title_en_preview = Column(String, nullable=True)
    description_en_preview = Column(String, nullable=True)
    
    # v4.1: Media & Compliance Assets
    origin_video_url = Column(String, nullable=True)
    certificate_images = Column(JSONB, server_default='[]')
    
    # v4.6.7: Visual Fingerprinting for deduplication
    visual_fingerprint = Column(String, index=True, nullable=True)
    
    # v7.0 Truth Engine: Vision Audit Columns
    vision_ocr_text = Column(Text, nullable=True)
    vision_audit_passed = Column(Boolean, default=True)
    vision_audit_notes = Column(Text, nullable=True)
    
    # v7.2 Truth Engine: Asset Fingerprint Columns
    source_pid = Column(String, index=True, nullable=True)
    image_fingerprint_md5 = Column(String, index=True, nullable=True)
    asset_lineage_verified = Column(Boolean, default=False)
    source_platform_id = Column(String, nullable=True)
    shopify_product_handle = Column(String, nullable=True)
    
    # v4.0: Desire Engine Snippets
    desire_hook = Column(String, nullable=True) # The Hook: Zapping the pain point
    desire_logic = Column(String, nullable=True) # The Logic: Brand tax deconstruction
    desire_closing = Column(String, nullable=True) # The Closing: FOMO & Ritual
    
    # v4.5 "Artisan-Master" Asset Base
    category = Column(String)
    category_type = Column(String, default="PROFIT") # 'TRAFFIC', 'PROFIT'
    is_cashback_eligible = Column(Boolean, default=True)
    
    # Business Tier: Logic & UI
    attributes = Column(JSONB, server_default='[]')
    variants_raw = Column(JSONB, server_default='[]')
    logistics_data = Column(JSONB, server_default='{}')
    
    # Asset Tier: Visual & Evidence
    mirror_assets = Column(JSONB, server_default='{}')
    
    # Black Box: Evidence, Social Proof, Tier Pricing
    structural_data = Column(JSONB, server_default='{}')
    raw_vendor_info = Column(JSONB, server_default='{}')
    
    audit_notes = Column(String, nullable=True)
    evidence = Column(JSONB, server_default='{}')
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# v4.5 GIN Indexes for Candidate Pool Exploration
Index('idx_candidate_attributes', CandidateProduct.attributes, postgresql_using='gin')
Index('idx_candidate_structural_data', CandidateProduct.structural_data, postgresql_using='gin')
