from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ProductItem(BaseModel):
    id: Any
    title: str
    price: float
    image: Optional[str] = None
    original_price: Optional[float] = None
    description: Optional[str] = None
    
    # v8.0 Metadata
    product_category_label: Optional[str] = None
    admin_tags: List[str] = []
    source_platform_name: Optional[str] = None
    category_name: Optional[str] = None
    warehouse_anchor: Optional[str] = None
    
    # Legacy fields
    category_type: Optional[str] = None # 'TRAFFIC', 'PROFIT'
    strategy_tag: Optional[str] = None
    handle: Optional[str] = None

class CategoryFeed(BaseModel):
    category: str
    products: List[ProductItem]

class DiscoveryResponse(BaseModel):
    vortex_featured: List[ProductItem]
    category_feeds: List[CategoryFeed]
    butler_greeting: str
    highlight_index: int = 0
    persona_id: Optional[str] = "default"
