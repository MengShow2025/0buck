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
    qualifications = Column(JSON)  # CE, ISO, etc.
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_id_1688 = Column(String, unique=True, index=True)
    shopify_product_id = Column(String, unique=True, index=True, nullable=True)
    
    title_zh = Column(String)
    title_en = Column(String)
    description_zh = Column(String)
    description_en = Column(String)
    
    original_price = Column(Float)  # 1688 cost in CNY
    sale_price = Column(Float)      # Final price in USD
    
    images = Column(JSON)           # List of image URLs
    variants = Column(JSON)         # SKU options
    
    category = Column(String)
    tags = Column(JSON)
    
    supplier_id = Column(Integer, ForeignKey("suppliers.id"))
    
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
