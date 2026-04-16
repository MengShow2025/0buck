from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class BAPType(str, Enum):
    PRODUCT_GRID = "0B_PRODUCT_GRID"
    CASHBACK_RADAR = "0B_CASHBACK_RADAR"
    WISH_WELL = "0B_WISH_WELL"
    BALANCE_VOUCHER = "0B_BALANCE_VOUCHER"

class BAP_Product(BaseModel):
    id: str
    title: str
    price: float
    image_url: str
    shopify_url: Optional[str] = None
    original_price: Optional[float] = None
    cashback_estimate: Optional[float] = None

class BAP_ProductGrid(BaseModel):
    """v4.0: 2x5 Swipeable Product Grid Payload."""
    type: BAPType = BAPType.PRODUCT_GRID
    title: str = "Recommended for You"
    products: List[BAP_Product]
    layout: str = "2x5" # Mobile optimized
    metadata: Dict[str, Any] = {}

class BAP_CashbackRadar(BaseModel):
    """v4.0: Real-time Cashback stats card."""
    type: BAPType = BAPType.CASHBACK_RADAR
    current_balance: float
    pending_cashback: float
    survival_rate: float # Based on Actuarial Engine
    phase: int # P1-P20

class BAP_WishWell(BaseModel):
    """v4.0: Community price-drop collective card."""
    type: BAPType = BAPType.WISH_WELL
    product_id: str
    target_price: float
    current_participants: int
    required_participants: int
    progress_percentage: float

class BAP_BalanceVoucher(BaseModel):
    """v4.0: One-click Checkout injection card."""
    type: BAPType = BAPType.BALANCE_VOUCHER
    code: str
    amount: float
    expires_at: str
    checkout_url: str
