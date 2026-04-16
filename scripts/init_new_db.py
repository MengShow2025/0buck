
import os
import ssl
import pg8000
import urllib.parse as urlparse
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, Index, JSON, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.pool import StaticPool

Base = declarative_base()

class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True, index=True)
    supplier_id_1688 = Column(String, unique=True, index=True)
    name = Column(String)
    rating = Column(Float)
    location_province = Column(String)
    location_city = Column(String)
    warehouse_anchor = Column(String)
    is_strength_merchant = Column(Boolean, default=False)
    can_dropship = Column(Boolean, default=True)
    ships_within_48h = Column(Boolean, default=True)
    has_bad_reviews_30d = Column(Boolean, default=False)
    qualifications = Column(JSONB, server_default='[]')
    custom_capability = Column(JSONB, server_default='{}')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    product_id_1688 = Column(String, unique=True, index=True)
    shopify_product_id = Column(String, unique=True, index=True, nullable=True)
    shopify_variant_id = Column(String, unique=True, index=True, nullable=True)
    titles = Column(JSONB, server_default='{}')
    descriptions = Column(JSONB, server_default='{}')
    title_zh = Column(String)
    title_en = Column(String)
    description_zh = Column(String)
    description_en = Column(String)
    original_price = Column(Float)
    source_cost_usd = Column(Float)
    sale_price = Column(Float)
    compare_at_price = Column(Float)
    amazon_price = Column(Float, nullable=True)
    ebay_price = Column(Float, nullable=True)
    amazon_compare_at_price = Column(Float, nullable=True)
    ebay_compare_at_price = Column(Float, nullable=True)
    amazon_link = Column(String, nullable=True)
    amazon_list_price = Column(Float, nullable=True)
    amazon_sale_price = Column(Float, nullable=True)
    hot_rating = Column(Float, nullable=True)
    profit_ratio = Column(Float, nullable=True)
    entry_tag = Column(String, index=True)
    platform_tag = Column(String, default='CJ', index=True)
    is_melted = Column(Boolean, default=False, index=True)
    melt_reason = Column(String, nullable=True)
    shipping_ratio = Column(Float, nullable=True)
    shipping_warning = Column(Boolean, default=False)
    cj_pid = Column(String, index=True)
    category_id = Column(String)
    category_name = Column(String)
    is_test_product = Column(Boolean, default=False)
    primary_image = Column(String)
    variant_images = Column(JSONB, server_default='[]')
    detail_images_html = Column(Text)
    sell_price = Column(Float)
    variant_sell_price = Column(Float)
    dimensions_display = Column(String)
    weight_display = Column(String)
    packing_weight = Column(Float)
    product_weight = Column(Float)
    freight_fee = Column(Float)
    shipping_days = Column(String)
    
    # New V7.9.8 Tagging Fields
    product_label = Column(String, index=True) # 返现, 普通, 0元, etc.
    sourcing_platform = Column(String, index=True) # CJ, Alibaba, etc.
    standard_category = Column(String, index=True) # 消费电子, etc.
    admin_tags = Column(JSONB, server_default='[]') # 热销, 促销, etc.
    search_tags = Column(JSONB, server_default='[]') # SEO/Search tags
    
    inventory_total = Column(Integer)
    warehouse_anchor = Column(String)
    variant_sku = Column(String)
    variant_key = Column(String)
    entry_code = Column(String)
    entry_name = Column(String)
    product_props = Column(JSONB, server_default='{}')
    images = Column(JSONB, server_default='[]')
    detail_images = Column(JSONB, server_default='[]')
    variants = Column(JSONB, server_default='[]')
    category = Column(String)
    tags = Column(JSONB, server_default='[]')
    weight = Column(Float, default=0.5)
    is_taxable = Column(Boolean, default=True)
    origin_video_url = Column(String, nullable=True)
    certificate_images = Column(JSONB, server_default='[]')
    metafields = Column(JSONB, server_default='{}')
    attributes = Column(JSONB, server_default='[]')
    variants_data = Column(JSONB, server_default='[]')
    logistics_data = Column(JSONB, server_default='{}')
    mirror_assets = Column(JSONB, server_default='{}')
    visual_fingerprint = Column(String, index=True, nullable=True)
    vision_ocr_text = Column(Text, nullable=True)
    vision_audit_passed = Column(Boolean, default=True)
    vision_audit_notes = Column(Text, nullable=True)
    source_pid = Column(String, index=True, nullable=True)
    image_fingerprint_md5 = Column(String, index=True, nullable=True)
    asset_lineage_verified = Column(Boolean, default=False)
    source_platform_id = Column(String, nullable=True)
    shopify_product_handle = Column(String, nullable=True)
    structural_data = Column(JSONB, server_default='{}')
    strategy_tag = Column(String, index=True)
    desire_hook = Column(String, nullable=True)
    desire_logic = Column(String, nullable=True)
    desire_closing = Column(String, nullable=True)
    last_stable_cost = Column(Float, nullable=True)
    price_fluctuation_threshold = Column(Float, default=0.15)
    scan_priority = Column(Integer, default=2)
    is_cashback_eligible = Column(Boolean, default=True)
    product_category_type = Column(String, default="PROFIT")
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    backup_suppliers = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    is_reward_eligible = Column(Boolean, default=True)
    # New V7.9 Tags
    product_category_label = Column(String, index=True) # 返现商品, 普通商品, 0元活动商品
    admin_tags = Column(JSONB, server_default='[]') # 热销, 促销, 预售, 众筹
    source_platform_name = Column(String, index=True) # CJ, 阿里国际, 速卖通, Wilo, 赛盈
    search_keywords = Column(Text)
    vibe_tags = Column(JSONB, server_default='[]') # Techie, Pet-lover, etc.
    last_synced_at = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

Index('idx_product_attributes', Product.attributes, postgresql_using='gin')
Index('idx_product_variants_data', Product.variants_data, postgresql_using='gin')
Index('idx_product_structural_data', Product.structural_data, postgresql_using='gin')

class ProductVector(Base):
    __tablename__ = "product_vectors"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    qdrant_point_id = Column(String, unique=True)
    embedding_model = Column(String)
    last_updated = Column(DateTime, default=func.now())

class CandidateProduct(Base):
    __tablename__ = "candidate_products"
    id = Column(Integer, primary_key=True, index=True)
    product_id_1688 = Column(String, unique=True, index=True)
    status = Column(String, default="new", index=True)
    source_platform = Column(String, default='1688', index=True)
    source_url = Column(String)
    backup_source_url = Column(String, nullable=True)
    obuck_price = Column(Float, nullable=True)
    freebie_shipping_price = Column(Float, default=6.99)
    is_freebie_eligible = Column(Boolean, default=False)
    amazon_shipping_fee = Column(Float, nullable=True)
    body_html = Column(Text)
    title_en = Column(String)
    description_en = Column(Text)
    discovery_source = Column(String)
    discovery_evidence = Column(JSONB, server_default='{}')
    title_zh = Column(String)
    description_zh = Column(String)
    images = Column(JSONB, server_default='[]')
    alibaba_comparison_price = Column(Float, nullable=True)
    cost_cny = Column(Float)
    comp_price_usd = Column(Float)
    amazon_price = Column(Float, nullable=True)
    ebay_price = Column(Float, nullable=True)
    amazon_compare_at_price = Column(Float, nullable=True)
    ebay_compare_at_price = Column(Float, nullable=True)
    market_comparison_url = Column(String, nullable=True)
    amazon_link = Column(String, nullable=True)
    amazon_list_price = Column(Float, nullable=True)
    amazon_sale_price = Column(Float, nullable=True)
    hot_rating = Column(Float, nullable=True)
    profit_ratio = Column(Float, nullable=True)
    entry_tag = Column(String, index=True)
    platform_tag = Column(String, default='CJ', index=True)
    is_melted = Column(Boolean, default=False, index=True)
    melt_reason = Column(String, nullable=True)
    shipping_ratio = Column(Float, nullable=True)
    shipping_warning = Column(Boolean, default=False)
    cj_pid = Column(String, index=True)
    category_id = Column(String)
    category_name = Column(String)
    is_test_product = Column(Boolean, default=False)
    primary_image = Column(String)
    variant_images = Column(JSONB, server_default='[]')
    detail_images_html = Column(Text)
    sell_price = Column(Float)
    variant_sell_price = Column(Float)
    dimensions_display = Column(String)
    weight_display = Column(String)
    packing_weight = Column(Float)
    product_weight = Column(Float)
    freight_fee = Column(Float)
    shipping_days = Column(String)
    
    # New V7.9.8 Tagging Fields
    product_label = Column(String, index=True) # 返现, 普通, 0元, etc.
    sourcing_platform = Column(String, index=True) # CJ, Alibaba, etc.
    standard_category = Column(String, index=True) # 消费电子, etc.
    admin_tags = Column(JSONB, server_default='[]') # 热销, 促销, etc.
    search_tags = Column(JSONB, server_default='[]') # SEO/Search tags
    
    inventory_total = Column(Integer)
    warehouse_anchor = Column(String)
    variant_sku = Column(String)
    variant_key = Column(String)
    entry_code = Column(String)
    entry_name = Column(String)
    product_props = Column(JSONB, server_default='{}')
    supplier_id_cj = Column(String)
    supplier_name = Column(String)
    vendor_rating = Column(Float)
    estimated_sale_price = Column(Float)
    supplier_id_1688 = Column(String)
    supplier_info = Column(JSONB, server_default='{}')
    title_en_preview = Column(String, nullable=True)
    description_en_preview = Column(String, nullable=True)
    origin_video_url = Column(String, nullable=True)
    certificate_images = Column(JSONB, server_default='[]')
    visual_fingerprint = Column(String, index=True, nullable=True)
    vision_ocr_text = Column(Text, nullable=True)
    vision_audit_passed = Column(Boolean, default=True)
    vision_audit_notes = Column(Text, nullable=True)
    source_pid = Column(String, index=True, nullable=True)
    image_fingerprint_md5 = Column(String, index=True, nullable=True)
    asset_lineage_verified = Column(Boolean, default=False)
    source_platform_id = Column(String, nullable=True)
    shopify_product_handle = Column(String, nullable=True)
    desire_hook = Column(String, nullable=True)
    desire_logic = Column(String, nullable=True)
    desire_closing = Column(String, nullable=True)
    category = Column(String)
    category_type = Column(String, default="PROFIT")
    is_cashback_eligible = Column(Boolean, default=True)
    # New V7.9 Tags for CandidateProduct
    product_category_label = Column(String, index=True) # 返现商品, 普通商品, 0元活动商品
    admin_tags = Column(JSONB, server_default='[]') # 热销, 促销, 预售, 众筹
    source_platform_name = Column(String, index=True) # CJ, 阿里国际, 速卖通, Wilo, 赛盈
    search_keywords = Column(Text)
    vibe_tags = Column(JSONB, server_default='[]') # Techie, Pet-lover, etc.
    attributes = Column(JSONB, server_default='[]')
    variants_raw = Column(JSONB, server_default='[]')
    logistics_data = Column(JSONB, server_default='{}')
    mirror_assets = Column(JSONB, server_default='{}')
    structural_data = Column(JSONB, server_default='{}')
    raw_vendor_info = Column(JSONB, server_default='{}')
    audit_notes = Column(String, nullable=True)
    evidence = Column(JSONB, server_default='{}')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

Index('idx_candidate_attributes', CandidateProduct.attributes, postgresql_using='gin')
Index('idx_candidate_structural_data', CandidateProduct.structural_data, postgresql_using='gin')

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb"

def main():
    db_url = DATABASE_URL
    if "postgresql://" in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    engine = create_engine(db_url, connect_args={"ssl_context": ssl_context}, poolclass=StaticPool)
    print("Connecting to new database...")
    # Drop existing to ensure schema update
    with engine.connect() as con:
        con.execute(text("DROP TABLE IF EXISTS candidate_products CASCADE"))
        con.execute(text("DROP TABLE IF EXISTS products CASCADE"))
        con.execute(text("DROP TABLE IF EXISTS suppliers CASCADE"))
        con.commit()
    Base.metadata.create_all(bind=engine)
    print("Successfully created all tables in the new Neon database.")

if __name__ == "__main__":
    main()
