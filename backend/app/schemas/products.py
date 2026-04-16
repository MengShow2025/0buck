from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from decimal import Decimal

class ProductBase(BaseModel):
    title: str
    price: Decimal
    original_price: Decimal
    image: str
    supplier: str
    category: str

class ProductResponse(ProductBase):
    id: int
    checkout_ready: bool = False
    checkout_block_reason: Optional[str] = None
    is_c2w: bool = False
    c2w_target: Optional[int] = None
    c2w_current: Optional[int] = None
    attributes: Dict[str, Any]
    structural_data: Dict[str, Any]

class ProductDetailResponse(ProductResponse):
    optimized_content: Dict[str, Any] # { "pain_points": [], "magic_moments": [] }
    mirror_assets: List[str]
    warehouse_anchor: Optional[str] = "CN"
    inventory: Optional[int] = 0

class DiscoveryResponse(BaseModel):
    products: List[ProductResponse]
    butler_greeting: str
    highlight_index: int = 0
    persona_id: str = "default"
