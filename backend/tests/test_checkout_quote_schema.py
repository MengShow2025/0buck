import pytest
from pydantic import ValidationError

from app.schemas.checkout import CheckoutQuoteResponse


def _base_payload():
    return {
        "status": "success",
        "quote_token": "token",
        "expires_in_seconds": 300,
        "checkout_ready": False,
        "not_ready_product_ids": [1],
        "not_ready_reasons": {"1": "not_published"},
        "checkout_block_reason": "not_published",
        "summary": {
            "subtotal": 10.0,
            "coupon_discount": 0.0,
            "balance_used": 0.0,
            "final_due": 10.0,
            "validated_discount_codes": [],
        },
    }


def test_checkout_quote_response_rejects_unknown_block_reason():
    payload = _base_payload()
    payload["checkout_block_reason"] = "random_reason"

    with pytest.raises(ValidationError):
        CheckoutQuoteResponse(**payload)


def test_checkout_quote_response_rejects_unknown_not_ready_reason():
    payload = _base_payload()
    payload["not_ready_reasons"] = {"1": "random_reason"}

    with pytest.raises(ValidationError):
        CheckoutQuoteResponse(**payload)


def test_checkout_quote_response_accepts_enum_reasons():
    payload = _base_payload()
    payload["checkout_block_reason"] = "inactive"
    payload["not_ready_reasons"] = {"1": "inactive"}

    obj = CheckoutQuoteResponse(**payload)

    assert obj.checkout_block_reason.value == "inactive"
    assert obj.not_ready_reasons["1"].value == "inactive"
