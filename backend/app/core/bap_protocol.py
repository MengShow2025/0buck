from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class BAPCardType(str, Enum):
    """v3.4 BAP Component Types"""
    PRODUCT_GRID = "0B_PRODUCT_GRID"
    CASHBACK_RADAR = "0B_CASHBACK_RADAR"
    WISH_WELL = "0B_WISH_WELL"
    LOGISTICS_RADAR = "0B_LOGISTICS_RADAR"

class PhysicalVerification(BaseModel):
    """v4.0 Physical Transparency Layer"""
    weight_kg: float
    dimensions_cm: Optional[str] = None # e.g. "10x5x2"
    verified_by: str = "0Buck"

class BAPProduct(BaseModel):
    id: str
    name: str
    image_url: str
    price: float
    original_price: Optional[float] = None
    currency: str = "USD"
    shopify_url: Optional[str] = None
    physical_verification: Optional[PhysicalVerification] = None # v4.0 Artisan Transparency

class BAP_ProductGrid(BaseModel):
    """Discovery Matrix supporting direct checkout"""
    products: List[BAPProduct]
    butler_comment: Optional[str] = None
    mobile_optimized: bool = True # v4.0 Forced responsive layout for H5/App

class BAP_CashbackRadar(BaseModel):
    """20-Phase Rebate Tracker"""
    current_phase: int = Field(..., ge=1, le=20)
    total_phases: int = 20
    amount_total: float
    amount_returned: float
    next_payout_date: Optional[str] = None
    status: str # 'active', 'completed', 'forfeited'

class BAP_WishWell(BaseModel):
    """Crowdfunding Wish Well"""
    wish_id: str
    title: str
    description: Optional[str] = None
    vote_count: int = 0
    goal_count: int
    image_url: Optional[str] = None
    is_voted: bool = False

class BAPAttachment(BaseModel):
    """Standard BAP Attachment Wrapper"""
    type: str = "0B_CARD_V3"
    component: BAPCardType
    data: Dict[str, Any]
    is_private: bool = False
