from pydantic import BaseModel
from typing import Dict, List, Optional

from app.core.checkout_block_reason import CheckoutBlockReason


class CheckoutQuoteSummary(BaseModel):
    subtotal: float
    coupon_discount: float
    balance_used: float
    final_due: float
    validated_discount_codes: List[str] = []


class CheckoutQuoteResponse(BaseModel):
    status: str
    quote_token: str
    expires_in_seconds: int
    checkout_ready: bool
    not_ready_product_ids: List[int] = []
    not_ready_reasons: Dict[str, CheckoutBlockReason] = {}
    checkout_block_reason: Optional[CheckoutBlockReason] = None
    summary: CheckoutQuoteSummary
