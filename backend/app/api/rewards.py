from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Any, Dict, List, Optional
from decimal import Decimal
from datetime import datetime, timedelta
from itertools import combinations
import base64
import hashlib
import hmac
import json
import time
import uuid
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.models.ledger import CheckinPlan, GroupBuyCampaign, Order, AvailableCoupon, ProcessedWebhookEvent
from app.models.product import Product, CandidateProduct
from app.services.rewards import RewardsService
from app.services.shopify_refunds import ShopifyRefundError, refund_order_full
from app.services.checkout_idempotency import (
    build_checkout_submit_event_id,
    normalize_checkout_submit_token,
)
from app.core.config import settings


router = APIRouter()


class RewardsCheckinRequest(BaseModel):
    user_id: int
    plan_id: str


class GroupFreeVerifyRequest(BaseModel):
    user_id: int
    order_id: int
    share_code: Optional[str] = None
    current_count: Optional[int] = None


class GroupFreeRetryRequest(BaseModel):
    order_id: int
    user_id: Optional[int] = None
    force: bool = False


class GroupFreeRetryBatchRequest(BaseModel):
    limit: int = 20
    force: bool = False


class PointsActivityAwardRequest(BaseModel):
    user_id: int
    event: str


class PointsExchangeRedeemRequest(BaseModel):
    user_id: int
    item_code: str
    plan_id: Optional[str] = None


class CouponEvaluationRequest(BaseModel):
    subtotal: float
    selected_codes: List[str] = []


class CheckoutQuoteRequest(BaseModel):
    items: List[Dict[str, Any]]
    balance_used: float = 0
    applied_discount_codes: List[str] = []
    is_full_payment: bool = False
    client_submit_token: str


def _normalize_plan_status(status: str) -> str:
    if status in {"pending_choice", "active_checkin", "active_groupbuy"}:
        return "active"
    if status in {"completed", "free_refunded", "forfeited"}:
        return status
    return status


DEFAULT_COUPON_STACKING_RULES: Dict[str, Any] = {
    "max_stack_size": 2,
    "allow_free_shipping_with_product_discount": True,
    "allow_multiple_product_discounts": False,
    "allow_multiple_shipping_discounts": False,
}


def _coupon_stack_group(coupon_type: str) -> str:
    if coupon_type == "free_shipping":
        return "shipping"
    return "product_discount"


def _coupon_savings(subtotal: float, coupon_type: str, value: float) -> float:
    if coupon_type == "percentage":
        return max(0.0, subtotal * (value / 100.0))
    if coupon_type == "fixed_amount":
        return max(0.0, value)
    return 0.0


def _can_stack_pair(a: Dict[str, Any], b: Dict[str, Any], rules: Dict[str, Any]) -> (bool, str):
    a_group = _coupon_stack_group(str(a.get("type") or ""))
    b_group = _coupon_stack_group(str(b.get("type") or ""))
    if a_group == "shipping" and b_group == "shipping":
        if not bool(rules.get("allow_multiple_shipping_discounts", False)):
            return False, "multiple_shipping_discounts_not_allowed"
    if a_group == "product_discount" and b_group == "product_discount":
        if not bool(rules.get("allow_multiple_product_discounts", False)):
            return False, "multiple_product_discounts_not_allowed"
    if {a_group, b_group} == {"shipping", "product_discount"}:
        if not bool(rules.get("allow_free_shipping_with_product_discount", True)):
            return False, "shipping_and_product_discount_not_stackable"
    return True, ""


def evaluate_coupon_selection(
    coupons: List[Dict[str, Any]],
    subtotal: float,
    selected_codes: Optional[List[str]] = None,
    rules: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    rules = rules or dict(DEFAULT_COUPON_STACKING_RULES)
    selected_codes = selected_codes or []
    now = datetime.utcnow()

    normalized_items: List[Dict[str, Any]] = []
    ineligible: List[Dict[str, str]] = []
    eligible_codes: List[str] = []
    by_code: Dict[str, Dict[str, Any]] = {}

    for raw in coupons:
        code = str(raw.get("code") or "").strip()
        if not code:
            continue
        ctype = str(raw.get("type") or "fixed_amount").strip().lower()
        if ctype not in {"fixed_amount", "percentage", "free_shipping"}:
            ctype = "fixed_amount"
        try:
            value = float(raw.get("value") or 0.0)
        except (TypeError, ValueError):
            value = 0.0
        min_req = float(raw.get("min_requirement") or 0.0)
        is_active = bool(raw.get("is_active", True))
        expires_at = raw.get("expires_at")
        not_expired = True
        if isinstance(expires_at, datetime):
            not_expired = expires_at > now
        elif isinstance(expires_at, str):
            try:
                not_expired = datetime.fromisoformat(expires_at.replace("Z", "+00:00")).replace(tzinfo=None) > now
            except Exception:
                not_expired = True
        eligible = is_active and not_expired and subtotal >= min_req
        reason = ""
        if not is_active:
            reason = "inactive"
        elif not not_expired:
            reason = "expired"
        elif subtotal < min_req:
            reason = "minimum_not_met"
        item = {
            "id": raw.get("id") or code,
            "code": code,
            "type": ctype,
            "value": value,
            "minimumAmount": min_req if min_req > 0 else None,
            "description": raw.get("description") or "",
            "isEligible": eligible,
            "ineligibleReason": reason or None,
            "stackGroup": _coupon_stack_group(ctype),
            "stackable": True,
        }
        normalized_items.append(item)
        by_code[code] = item
        if eligible:
            eligible_codes.append(code)
        else:
            ineligible.append({"code": code, "reason": reason or "ineligible"})

    selected_valid_codes: List[str] = [c for c in selected_codes if c in eligible_codes]
    rejected_pairs: List[Dict[str, str]] = []
    can_stack_selected = True
    stack_reason = ""
    if len(selected_valid_codes) > int(rules.get("max_stack_size", 2)):
        can_stack_selected = False
        stack_reason = "exceeds_max_stack_size"
    for c1, c2 in combinations(selected_valid_codes, 2):
        ok, reason = _can_stack_pair(by_code[c1], by_code[c2], rules)
        if not ok:
            rejected_pairs.append({"code_a": c1, "code_b": c2, "reason": reason})
            can_stack_selected = False
            if not stack_reason:
                stack_reason = reason

    if can_stack_selected:
        final_selected_codes = selected_valid_codes
    else:
        # Keep only first valid coupon when selected stack is invalid.
        final_selected_codes = selected_valid_codes[:1]

    selected_breakdown = [
        {
            "code": code,
            "discount": _coupon_savings(subtotal, by_code[code]["type"], float(by_code[code]["value"])),
        }
        for code in final_selected_codes
    ]
    selected_total = sum(x["discount"] for x in selected_breakdown)

    # Recommend best legal combination under rules.
    eligible_items = [by_code[c] for c in eligible_codes]
    max_stack_size = max(1, int(rules.get("max_stack_size", 2)))
    best_codes: List[str] = []
    best_savings = -1.0
    for size in range(1, min(max_stack_size, len(eligible_items)) + 1):
        for combo in combinations(eligible_items, size):
            combo_codes = [c["code"] for c in combo]
            legal = True
            for a, b in combinations(combo, 2):
                ok, _ = _can_stack_pair(a, b, rules)
                if not ok:
                    legal = False
                    break
            if not legal:
                continue
            savings = sum(_coupon_savings(subtotal, c["type"], float(c["value"])) for c in combo)
            if savings > best_savings:
                best_savings = savings
                best_codes = combo_codes
    if best_savings < 0:
        best_savings = 0.0

    # Mark whether each eligible coupon can be added to current selected set.
    current_selected_set = set(final_selected_codes)
    for item in normalized_items:
        if not item["isEligible"]:
            item["isStackableWithSelection"] = False
            continue
        if item["code"] in current_selected_set:
            item["isStackableWithSelection"] = True
            continue
        hypothetical = list(current_selected_set | {item["code"]})
        if len(hypothetical) > max_stack_size:
            item["isStackableWithSelection"] = False
            item["nonStackReason"] = "exceeds_max_stack_size"
            continue
        stack_ok = True
        reason = ""
        for c1, c2 in combinations(hypothetical, 2):
            ok, reason = _can_stack_pair(by_code[c1], by_code[c2], rules)
            if not ok:
                stack_ok = False
                break
        item["isStackableWithSelection"] = stack_ok
        if not stack_ok:
            item["nonStackReason"] = reason

    return {
        "items": normalized_items,
        "eligibility": {
            "eligible_codes": eligible_codes,
            "ineligible": ineligible,
        },
        "selected": {
            "requested_codes": selected_codes,
            "valid_codes": final_selected_codes,
            "can_stack": can_stack_selected,
            "reason": stack_reason or None,
            "rejected_pairs": rejected_pairs,
            "breakdown": selected_breakdown,
            "total_discount": selected_total,
            "final_subtotal": max(0.0, subtotal - selected_total),
        },
        "best_combo": {
            "codes": best_codes,
            "total_discount": best_savings,
            "final_subtotal": max(0.0, subtotal - best_savings),
        },
        "rules": {
            "max_stack_size": max_stack_size,
            "allow_free_shipping_with_product_discount": bool(rules.get("allow_free_shipping_with_product_discount", True)),
            "allow_multiple_product_discounts": bool(rules.get("allow_multiple_product_discounts", False)),
            "allow_multiple_shipping_discounts": bool(rules.get("allow_multiple_shipping_discounts", False)),
        },
    }


def enforce_checkout_amount_guards(
    subtotal: Decimal,
    coupon_discount: Decimal,
    balance_used: Decimal,
    is_full_payment: bool,
    allow_coupon_with_full_balance: bool = False,
) -> Dict[str, Decimal]:
    subtotal = Decimal(str(subtotal or "0"))
    coupon_discount = Decimal(str(coupon_discount or "0"))
    balance_used = Decimal(str(balance_used or "0"))

    if subtotal <= 0:
        raise ValueError("invalid_subtotal")
    if coupon_discount < 0:
        raise ValueError("invalid_coupon_discount")
    if balance_used < 0:
        raise ValueError("invalid_balance_used")
    if coupon_discount > subtotal:
        raise ValueError("coupon_discount_exceeds_subtotal")
    if is_full_payment and coupon_discount > 0 and not allow_coupon_with_full_balance:
        raise ValueError("full_balance_payment_does_not_support_coupon_discount")

    max_balance_usable = subtotal - coupon_discount
    if balance_used > max_balance_usable:
        raise ValueError("balance_used_exceeds_max_usable")

    final_due = subtotal - coupon_discount - balance_used
    if final_due < Decimal("0"):
        final_due = Decimal("0")

    if is_full_payment and final_due > Decimal("0.01"):
        raise ValueError("full_balance_payment_insufficient")

    return {
        "max_balance_usable": max_balance_usable,
        "final_due": final_due,
    }


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode((raw + padding).encode("utf-8"))


def sign_checkout_quote(payload: Dict[str, Any], secret: str) -> str:
    body_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    body = _b64url_encode(body_json)
    sig = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    return f"{body}.{_b64url_encode(sig)}"


def verify_checkout_quote_signature(token: str, secret: str) -> Dict[str, Any]:
    try:
        body, sig = token.split(".", 1)
    except ValueError:
        raise ValueError("invalid_quote_token_format")
    expected = hmac.new(secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    actual = _b64url_decode(sig)
    if not hmac.compare_digest(expected, actual):
        raise ValueError("invalid_quote_token_signature")
    payload = json.loads(_b64url_decode(body))
    if not isinstance(payload, dict):
        raise ValueError("invalid_quote_token_payload")
    return payload


def _checkout_items_fingerprint(items: List[Dict[str, Any]]) -> str:
    canonical = [{"product_id": int(x["product_id"]), "quantity": int(x["quantity"])} for x in items]
    canonical.sort(key=lambda x: (x["product_id"], x["quantity"]))
    raw = json.dumps(canonical, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def _prepare_checkout_context(
    db: Session,
    payload: Dict[str, Any],
    customer_id: int,
) -> Dict[str, Any]:
    raw_items = payload.get("items", [])
    balance_used = Decimal(str(payload.get("balance_used", "0")))
    is_full_payment = bool(payload.get("is_full_payment"))
    selected_codes = payload.get("applied_discount_codes", []) or []

    if not isinstance(raw_items, list) or len(raw_items) == 0:
        raise HTTPException(status_code=400, detail="items_required")

    sanitized_items: List[Dict[str, Any]] = []
    subtotal = Decimal("0")
    for item in raw_items:
        try:
            product_id = int(item.get("product_id"))
            quantity = int(item.get("quantity", 1))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="invalid_item_format")
        if quantity <= 0 or quantity > 20:
            raise HTTPException(status_code=400, detail="invalid_item_quantity")
        product = (
            db.query(Product.id, Product.shopify_variant_id, Product.sale_price)
            .filter(Product.id == product_id, Product.is_active == True)
            .first()
        )
        if not product:
            candidate = (
                db.query(CandidateProduct.id)
                .filter(CandidateProduct.id == product_id)
                .first()
            )
            if candidate:
                raise HTTPException(status_code=400, detail=f"product_not_ready_for_checkout:{product_id}")
            cj_row = db.execute(
                text("SELECT id FROM cj_raw_products WHERE id = :pid LIMIT 1"),
                {"pid": product_id},
            ).first()
            if cj_row:
                raise HTTPException(status_code=400, detail=f"product_not_ready_for_checkout:{product_id}")
            raise HTTPException(status_code=400, detail=f"product_not_found:{product_id}")
        if not product.shopify_variant_id:
            raise HTTPException(status_code=400, detail=f"product_variant_missing:{product_id}")
        sale_price = Decimal(str(product.sale_price or 0))
        if sale_price <= 0:
            raise HTTPException(status_code=400, detail=f"invalid_product_price:{product_id}")
        subtotal += sale_price * quantity
        sanitized_items.append({"product_id": product_id, "quantity": quantity})

    from app.services.config_service import ConfigService
    config = ConfigService(db)
    rules = config.get("COUPON_STACKING_RULES", DEFAULT_COUPON_STACKING_RULES) or DEFAULT_COUPON_STACKING_RULES
    coupon_rows = db.query(AvailableCoupon).filter(AvailableCoupon.is_active == True).all()
    coupon_inputs: List[Dict[str, Any]] = []
    for row in coupon_rows:
        coupon_inputs.append(
            {
                "id": row.code,
                "code": row.code,
                "type": row.type if row.type in {"fixed_amount", "percentage", "free_shipping"} else "fixed_amount",
                "value": float(row.value or 0.0),
                "min_requirement": float(row.min_requirement or 0.0),
                "description": row.ai_category or "Shopify discount",
                "is_active": bool(row.is_active),
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
            }
        )
    coupon_eval = evaluate_coupon_selection(
        coupons=coupon_inputs,
        subtotal=float(subtotal),
        selected_codes=selected_codes,
        rules=rules,
    )
    coupon_discount = Decimal(str(coupon_eval.get("selected", {}).get("total_discount", 0)))

    try:
        guard = enforce_checkout_amount_guards(
            subtotal=subtotal,
            coupon_discount=coupon_discount,
            balance_used=balance_used,
            is_full_payment=is_full_payment,
            allow_coupon_with_full_balance=False,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "customer_id": customer_id,
        "sanitized_items": sanitized_items,
        "item_fingerprint": _checkout_items_fingerprint(sanitized_items),
        "subtotal": subtotal,
        "balance_used": balance_used,
        "is_full_payment": is_full_payment,
        "selected_codes": selected_codes,
        "coupon_eval": coupon_eval,
        "coupon_discount": coupon_discount,
        "guard": guard,
    }


from app.api.deps import get_current_user, get_current_admin
from app.models.ledger import UserExt, WalletTransaction
from app.models.rewards import PointTransaction, PointSource

@router.post("/checkin")
def rewards_checkin(
    payload: RewardsCheckinRequest, 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.5.0: Secure Check-in with JWT Enforcement.
    """
    if current_user.customer_id != payload.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot check-in for another user")
        
    rewards = RewardsService(db, current_user_id=current_user.customer_id)
    res = rewards.process_checkin(payload.user_id, payload.plan_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("message", "checkin_failed"))
    return res

@router.get("/status/{user_id}")
def rewards_status(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.5.0: Secure Status view with IDOR protection.
    """
    if current_user.customer_id != user_id:
        # Check if current_user is admin
        if current_user.user_type not in ["kol", "admin"]:
            raise HTTPException(status_code=403, detail="Forbidden: Access denied")
            
    rewards = RewardsService(db, current_user_id=current_user.customer_id)
    wallet = rewards.get_wallet_summary(user_id)
    level = rewards.get_user_level(user_id)
    user_ext = db.query(UserExt).filter_by(customer_id=user_id).first()
    
    from app.services.finance_engine import get_reward_rates
    sys_rates = get_reward_rates(db)

    plans = db.query(CheckinPlan).filter(CheckinPlan.user_id == user_id).order_by(CheckinPlan.order_id.desc()).all()
    plan_items: List[Dict[str, Any]] = []
    for p in plans:
        plan_items.append(
            {
                "id": str(p.id),
                "order_id": p.order_id,
                "status": _normalize_plan_status(p.status),
                "raw_status": p.status,
                "reward_base": float(p.reward_base) if isinstance(p.reward_base, Decimal) else float(p.reward_base or 0),
                "current_period": p.current_period,
                "consecutive_days": p.consecutive_days,
                "total_earned": float(p.total_earned) if isinstance(p.total_earned, Decimal) else float(p.total_earned or 0),
                "timezone": p.timezone,
                "last_checkin_at": p.last_checkin_at.isoformat() if p.last_checkin_at else None,
                "expires_at": p.expires_at.isoformat() if p.expires_at else None,
                "confirmed_at": p.confirmed_at.isoformat() if p.confirmed_at else None,
            }
        )

    # Get effective rates
    if user_ext:
        if user_ext.user_type == 'kol':
            dist_rate = float(user_ext.dist_rate) if user_ext.dist_rate else float(sys_rates['kol_dist_default'])
            fan_rate = float(user_ext.fan_rate) if user_ext.fan_rate else float(sys_rates['kol_fan_default'])
        else:
            # For ordinary users, we show the tier rate
            dist_rate = float(level.get("rate", 0.015))
            # Fan rates are fixed tiered for ordinary users
            fan_rates_map = {
                'silver': float(sys_rates['fan_silver_rate']),
                'gold': float(sys_rates['fan_gold_rate']),
                'platinum': float(sys_rates['fan_platinum_rate'])
            }
            fan_rate = fan_rates_map.get(user_ext.user_tier, float(sys_rates['fan_silver_rate']))
    else:
        dist_rate = 0.015
        fan_rate = 0.01

    return {
        "user_id": user_id,
        "user_type": user_ext.user_type if user_ext else "customer",
        "user_tier": user_ext.user_tier if user_ext else "silver",
        "referral_code": user_ext.referral_code if user_ext else None,
        "dist_rate": dist_rate,
        "fan_rate": fan_rate,
        "wallet": wallet,
        "level": {
            "level": level.get("level"),
            "rate": str(level.get("rate")),
            "invitees": int(level.get("invitees") or 0),
            "total_volume": float(level.get("total_volume") or 0),
        },
        "plans": plan_items,
        "transactions": rewards.get_transaction_history(user_id, limit=20)
    }


@router.post("/group-free/verify")
def verify_group_free(
    payload: GroupFreeVerifyRequest, 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.5.0: Secure Group Buy Refund Verification.
    STRICT: Order owner must match current JWT user.
    """
    if current_user.customer_id != payload.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: IDOR protection triggered")

    # Ensure the order belongs to this user
    order = db.query(Order).filter_by(shopify_order_id=payload.order_id).first()
    if order and order.user_id != payload.user_id:
         raise HTTPException(status_code=403, detail="Forbidden: Order ownership mismatch")

    plan = db.query(CheckinPlan).filter(CheckinPlan.user_id == payload.user_id, CheckinPlan.order_id == payload.order_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="plan_not_found")

    eligible = plan.status in {"pending_choice", "active_checkin", "active_groupbuy"} and (plan.current_period or 1) == 1

    gb = db.query(GroupBuyCampaign).filter_by(owner_order_id=payload.order_id).first()
    if not gb:
        import uuid
        gb = GroupBuyCampaign(owner_order_id=payload.order_id, share_code=uuid.uuid4().hex[:20], required_count=3, current_count=0, status="open")
        db.add(gb)

    if payload.share_code:
        gb.share_code = payload.share_code

    if payload.current_count is not None:
        gb.current_count = payload.current_count

    if eligible and gb.current_count >= gb.required_count:
        order = db.query(Order).filter_by(shopify_order_id=payload.order_id).first()
        if not order:
            order = Order(
                shopify_order_id=payload.order_id,
                user_id=payload.user_id,
                order_number=str(payload.order_id),
                total_price=Decimal("0.0"),
                currency="USD",
                status="paid",
                refund_status="none",
            )
            db.add(order)
            db.commit()

        if order.refund_status in {"pending", "refunded"}:
            gb.status = "success"
            plan.status = "free_refunded"
            db.commit()
            return {
                "status": "success",
                "eligible": True,
                "order_id": payload.order_id,
                "group_buy": {
                    "share_code": gb.share_code,
                    "required_count": gb.required_count,
                    "current_count": gb.current_count,
                    "status": gb.status,
                },
                "refund": {
                    "status": order.refund_status,
                    "idempotent": True,
                    "refund_txn_id": order.refund_txn_id,
                },
            }

        order.refund_status = "pending"
        order.refund_attempts = (order.refund_attempts or 0) + 1
        order.last_refund_attempt_at = datetime.utcnow()
        db.commit()

        gb.status = "success"
        plan.status = "free_refunded"
        db.commit()

        try:
            ok, result = refund_order_full(order_id=payload.order_id)
            refund = result.get("refund") if isinstance(result, dict) else None

            txn_id = None
            if isinstance(refund, dict):
                txs = refund.get("transactions") or []
                if txs and isinstance(txs, list) and isinstance(txs[0], dict):
                    txn_id = txs[0].get("id")

            order.refund_status = "refunded"
            order.refund_txn_id = str(txn_id) if txn_id is not None else order.refund_txn_id
            order.refund_error = None
            order.refunded_at = datetime.utcnow()
            order.status = "refunded"
            db.commit()

            clawback = RewardsService(db, current_user_id=current_user.customer_id).clawback_rewards_for_order(payload.order_id)

            return {
                "status": "success",
                "eligible": True,
                "order_id": payload.order_id,
                "group_buy": {
                    "share_code": gb.share_code,
                    "required_count": gb.required_count,
                    "current_count": gb.current_count,
                    "status": gb.status,
                },
                "refund": {
                    "status": "refunded",
                    "idempotent": bool(result.get("idempotent")) if isinstance(result, dict) else False,
                    "refund_txn_id": order.refund_txn_id,
                },
                "reward_clawback": clawback,
            }
        except ShopifyRefundError as e:
            order.refund_error = {"message": str(e), "status_code": e.status_code, "details": e.details}
            if e.status_code == 429 or (e.status_code is not None and e.status_code >= 500):
                order.refund_status = "refund_retry_needed"
            else:
                order.refund_status = "failed"
            db.commit()

            return {
                "status": "refund_failed",
                "eligible": True,
                "order_id": payload.order_id,
                "group_buy": {
                    "share_code": gb.share_code,
                    "required_count": gb.required_count,
                    "current_count": gb.current_count,
                    "status": gb.status,
                },
                "refund": {
                    "status": order.refund_status,
                    "refund_txn_id": order.refund_txn_id,
                    "error": {"status_code": e.status_code},
                },
            }

    db.commit()
    return {
        "status": "pending",
        "eligible": eligible,
        "order_id": payload.order_id,
        "group_buy": {
            "share_code": gb.share_code,
            "required_count": gb.required_count,
            "current_count": gb.current_count,
            "status": gb.status,
        },
    }


@router.post("/group-free/retry")
def retry_group_free_refund(
    payload: GroupFreeRetryRequest, 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.5.0: Secure Refund Retry.
    """
    if not payload.user_id:
        payload.user_id = current_user.customer_id
        
    if current_user.customer_id != payload.user_id:
        if current_user.user_type not in ["kol", "admin"]:
            raise HTTPException(status_code=403, detail="Forbidden: Admin only")
            
    order = (
        db.query(Order)
        .filter_by(shopify_order_id=payload.order_id)
        .with_for_update()
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="order_not_found")

    if payload.user_id is not None and order.user_id != payload.user_id:
        raise HTTPException(status_code=403, detail="order_user_mismatch")

    if order.refund_status in {"pending", "refunded"}:
        return {
            "status": "skipped",
            "reason": "already_pending_or_refunded",
            "order_id": payload.order_id,
            "refund": {"status": order.refund_status, "refund_txn_id": order.refund_txn_id},
        }

    if order.refund_status != "refund_retry_needed" and not payload.force:
        return {
            "status": "skipped",
            "reason": "not_retry_needed",
            "order_id": payload.order_id,
            "refund": {"status": order.refund_status, "refund_txn_id": order.refund_txn_id},
        }

    plan = db.query(CheckinPlan).filter_by(order_id=payload.order_id).first()
    if plan and plan.status in {"pending_choice", "active_checkin", "active_groupbuy"}:
        plan.status = "free_refunded"

    gb = db.query(GroupBuyCampaign).filter_by(owner_order_id=payload.order_id).first()
    if gb and gb.status != "success":
        gb.status = "success"

    order.refund_status = "pending"
    order.refund_attempts = (order.refund_attempts or 0) + 1
    order.last_refund_attempt_at = datetime.utcnow()
    db.commit()

    try:
        _, result = refund_order_full(order_id=payload.order_id)
        refund = result.get("refund") if isinstance(result, dict) else None

        txn_id = None
        if isinstance(refund, dict):
            txs = refund.get("transactions") or []
            if txs and isinstance(txs, list) and isinstance(txs[0], dict):
                txn_id = txs[0].get("id")

        order.refund_status = "refunded"
        order.refund_txn_id = str(txn_id) if txn_id is not None else order.refund_txn_id
        order.refund_error = None
        order.refunded_at = datetime.utcnow()
        order.status = "refunded"
        db.commit()

        clawback = RewardsService(db, current_user_id=current_user.customer_id).clawback_rewards_for_order(payload.order_id)

        return {
            "status": "success",
            "order_id": payload.order_id,
            "refund": {
                "status": "refunded",
                "refund_txn_id": order.refund_txn_id,
                "attempts": order.refund_attempts,
            },
            "reward_clawback": clawback,
        }
    except ShopifyRefundError as e:
        order.refund_error = {"message": str(e), "status_code": e.status_code, "details": e.details}
        if e.status_code == 429 or (e.status_code is not None and e.status_code >= 500):
            order.refund_status = "refund_retry_needed"
        else:
            order.refund_status = "failed"
        db.commit()

        return {
            "status": "refund_failed",
            "order_id": payload.order_id,
            "refund": {
                "status": order.refund_status,
                "refund_txn_id": order.refund_txn_id,
                "attempts": order.refund_attempts,
                "error": {"status_code": e.status_code},
            },
        }


@router.get("/group-free/retry-queue")
def group_free_refund_retry_queue(
    limit: int = 50,
    include_failed: bool = False,
    user_id: Optional[int] = None,
    error_status_code: Optional[int] = None,
    cursor: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: UserExt = Depends(get_current_admin)
):
    """
    v3.5.0: Admin-only refund queue access.
    """
    n = max(1, min(int(limit), 500))
    statuses = ["refund_retry_needed"]
    if include_failed:
        statuses.append("failed")

    q = db.query(Order).filter(Order.refund_status.in_(statuses))
    if user_id is not None:
        q = q.filter(Order.user_id == user_id)

    if cursor:
        try:
            cursor_ts_str, cursor_id_str = cursor.split("|", 1)
            cursor_ts = datetime.fromisoformat(cursor_ts_str)
            cursor_id = int(cursor_id_str)
            q = q.filter(
                (Order.updated_at > cursor_ts)
                | ((Order.updated_at == cursor_ts) & (Order.shopify_order_id > cursor_id))
            )
        except Exception:
            raise HTTPException(status_code=400, detail="invalid_cursor")

    fetch_limit = n * 5 if error_status_code is not None else n

    orders = q.order_by(Order.updated_at.asc(), Order.shopify_order_id.asc()).limit(fetch_limit).all()

    items: List[Dict[str, Any]] = []
    for o in orders:
        err = o.refund_error or {}
        status_code = err.get("status_code") if isinstance(err, dict) else None
        if error_status_code is not None and status_code != int(error_status_code):
            continue
        items.append(
            {
                "order_id": o.shopify_order_id,
                "user_id": o.user_id,
                "refund_status": o.refund_status,
                "refund_txn_id": o.refund_txn_id,
                "refund_attempts": o.refund_attempts,
                "last_refund_attempt_at": o.last_refund_attempt_at.isoformat() if o.last_refund_attempt_at else None,
                "updated_at": o.updated_at.isoformat() if getattr(o, "updated_at", None) else None,
                "error_status_code": status_code,
            }
        )

    items = items[:n]
    next_cursor = None
    if items:
        last = items[-1]
        if last.get("updated_at") and last.get("order_id") is not None:
            next_cursor = f"{last['updated_at']}|{last['order_id']}"

    return {"status": "ok", "count": len(items), "next_cursor": next_cursor, "items": items}


@router.get("/transactions/{user_id}")
def get_transactions(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.5.0: Secure transaction history with IDOR protection.
    """
    if current_user.customer_id != user_id and current_user.user_type not in ["kol", "admin"]:
         raise HTTPException(status_code=403, detail="Forbidden")
         
    from app.models.ledger import WalletTransaction
    txs = db.query(WalletTransaction).filter(WalletTransaction.user_id == user_id).order_by(WalletTransaction.created_at.desc()).all()
    return [
        {
            "id": str(tx.id),
            "amount": float(tx.amount),
            "type": tx.type,
            "status": tx.status,
            "order_id": tx.order_id,
            "description": tx.description,
            "created_at": tx.created_at.isoformat()
        }
        for tx in txs
    ]


@router.get("/orders/me")
def get_my_orders(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    n = max(1, min(int(limit), 300))
    rows = (
        db.query(Order)
        .filter(Order.user_id == current_user.customer_id)
        .order_by(Order.created_at.desc())
        .limit(n)
        .all()
    )
    items: List[Dict[str, Any]] = []
    for o in rows:
        ui_status = str(o.status or "paid")
        if o.refund_status in {"pending", "refund_retry_needed"}:
            ui_status = "refunding"
        elif o.refund_status == "refunded":
            ui_status = "refunding"
        cashback = Decimal(str(o.total_price or 0)) * Decimal("0.1")
        items.append(
            {
                "order_id": str(o.order_number or o.shopify_order_id),
                "shopify_order_id": int(o.shopify_order_id),
                "status": ui_status,
                "total_price": float(o.total_price or 0),
                "currency": o.currency or "USD",
                "created_at": o.created_at.isoformat() if o.created_at else None,
                "cashback_estimated": float(cashback),
                "tracking_number": o.tracking_number,
                "fulfillment_status": o.fulfillment_status,
            }
        )
    return {"status": "success", "items": items}


@router.get("/points/rules")
def get_points_rules(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    rewards = RewardsService(db, current_user_id=current_user.customer_id)
    return {
        "status": "success",
        "activity_rules": rewards.get_points_activity_rules(),
        "multipliers": rewards.get_points_multipliers(),
    }


@router.get("/points/exchange-catalog")
def get_points_exchange_catalog(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    rewards = RewardsService(db, current_user_id=current_user.customer_id)
    catalog = [item for item in rewards.get_points_exchange_catalog() if bool(item.get("enabled", True))]
    return {"status": "success", "items": catalog}


@router.post("/points/activity")
def award_points_activity(
    payload: PointsActivityAwardRequest,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    if current_user.customer_id != payload.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot award points for another user")
    rewards = RewardsService(db, current_user_id=current_user.customer_id)
    res = rewards.award_activity_points(payload.user_id, payload.event)
    if res.get("status") != "success":
        raise HTTPException(status_code=400, detail=res.get("message", "points_award_failed"))
    return res


@router.post("/points/exchange/redeem")
def redeem_points_exchange(
    payload: PointsExchangeRedeemRequest,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    if current_user.customer_id != payload.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot redeem points for another user")
    rewards = RewardsService(db, current_user_id=current_user.customer_id)
    res = rewards.redeem_points_exchange_item(
        customer_id=payload.user_id,
        item_code=payload.item_code,
        plan_id=payload.plan_id,
    )
    if res.get("status") != "success":
        raise HTTPException(status_code=400, detail=res.get("message", "points_exchange_failed"))
    return res

@router.post("/payment/pre-check")
def payment_pre_check(
    payload: Dict[str, Any], 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.8.0: Pre-check inventory, balance, and PAYMENT PASSWORD.
    """
    customer_id = current_user.customer_id
    balance_to_use = Decimal(str(payload.get("balance_to_use", "0")))
    payment_password = payload.get("payment_password")
    
    if balance_to_use > 0:
        # 1. v3.8.0 MUST check payment password if balance is used
        if not current_user.hashed_payment_password:
            raise HTTPException(status_code=400, detail="Payment password not set. Please set it in security settings.")
        
        from app.core.security import verify_password
        # Check lockout
        now = datetime.utcnow()
        if current_user.payment_pass_locked_until and current_user.payment_pass_locked_until > now:
            raise HTTPException(status_code=429, detail="Payment password locked due to multiple failures.")

        if not payment_password or not verify_password(payment_password, current_user.hashed_payment_password):
            current_user.payment_pass_failed_attempts += 1
            if current_user.payment_pass_failed_attempts >= 5:
                current_user.payment_pass_locked_until = now + timedelta(hours=24)
            db.commit()
            raise HTTPException(status_code=400, detail="Invalid payment password")

        # 2. Reset failed attempts on success
        current_user.payment_pass_failed_attempts = 0
        db.commit()

        # 3. Attempt to freeze balance
        rewards = RewardsService(db, current_user_id=customer_id)
        success = rewards.freeze_balance(customer_id, balance_to_use, "PENDING_ORDER")
        if not success:
            raise HTTPException(status_code=400, detail="Insufficient balance or freeze failed")
            
    return {"status": "success", "message": "Verification successful, balance frozen."}


@router.get("/payment/discounts")
def list_checkout_discounts(
    subtotal: float = 0,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    User checkout discount source (replaces frontend mock coupon list).
    """
    from app.services.config_service import ConfigService
    rows = db.query(AvailableCoupon).filter(AvailableCoupon.is_active == True).all()
    coupons: List[Dict[str, Any]] = []
    for row in rows:
        coupons.append(
            {
                "id": row.code,
                "code": row.code,
                "type": row.type if row.type in {"fixed_amount", "percentage", "free_shipping"} else "fixed_amount",
                "value": float(row.value or 0.0),
                "min_requirement": float(row.min_requirement or 0.0),
                "description": row.ai_category or "Shopify discount",
                "is_active": bool(row.is_active),
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
            }
        )
    config = ConfigService(db)
    rules = config.get("COUPON_STACKING_RULES", DEFAULT_COUPON_STACKING_RULES) or DEFAULT_COUPON_STACKING_RULES
    result = evaluate_coupon_selection(coupons=coupons, subtotal=float(subtotal or 0.0), selected_codes=[], rules=rules)
    return {"status": "success", **result}


@router.post("/payment/discounts/evaluate")
def evaluate_checkout_discounts(
    payload: CouponEvaluationRequest,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    Evaluate coupon eligibility, stacking validity, and best combination.
    """
    from app.services.config_service import ConfigService
    rows = db.query(AvailableCoupon).filter(AvailableCoupon.is_active == True).all()
    coupons: List[Dict[str, Any]] = []
    for row in rows:
        coupons.append(
            {
                "id": row.code,
                "code": row.code,
                "type": row.type if row.type in {"fixed_amount", "percentage", "free_shipping"} else "fixed_amount",
                "value": float(row.value or 0.0),
                "min_requirement": float(row.min_requirement or 0.0),
                "description": row.ai_category or "Shopify discount",
                "is_active": bool(row.is_active),
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
            }
        )
    config = ConfigService(db)
    rules = config.get("COUPON_STACKING_RULES", DEFAULT_COUPON_STACKING_RULES) or DEFAULT_COUPON_STACKING_RULES
    result = evaluate_coupon_selection(
        coupons=coupons,
        subtotal=float(payload.subtotal or 0.0),
        selected_codes=payload.selected_codes,
        rules=rules,
    )
    return {"status": "success", **result}

from app.services.smart_business import SmartBusinessService

@router.post("/payment/create-order")
def create_payment_order(
    payload: Dict[str, Any], 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.5.0: Create Draft Order (B) or Direct Order (C).
    """
    from app.services.shopify_payment_service import ShopifyDraftOrderService
    payment_service = ShopifyDraftOrderService()
    
    customer_id = current_user.customer_id
    balance_used = Decimal(str(payload.get("balance_used", "0")))
    referral_code = payload.get("referral_code")
    quote_token = str(payload.get("quote_token") or "").strip()
    if not quote_token:
        raise HTTPException(status_code=400, detail="quote_token_required")

    ctx = _prepare_checkout_context(db=db, payload=payload, customer_id=customer_id)
    sanitized_items = ctx["sanitized_items"]
    subtotal: Decimal = ctx["subtotal"]
    coupon_eval = ctx["coupon_eval"]
    coupon_discount: Decimal = ctx["coupon_discount"]
    guard = ctx["guard"]
    is_full_payment = ctx["is_full_payment"]
    item_fingerprint = ctx["item_fingerprint"]

    quote = verify_checkout_quote_signature(quote_token, settings.SECRET_KEY)
    if int(quote.get("user_id", 0)) != int(customer_id):
        raise HTTPException(status_code=400, detail="quote_user_mismatch")
    if int(quote.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=400, detail="quote_expired")
    if str(quote.get("item_fingerprint", "")) != item_fingerprint:
        raise HTTPException(status_code=400, detail="quote_item_mismatch")
    if str(quote.get("subtotal", "")) != str(subtotal):
        raise HTTPException(status_code=400, detail="quote_subtotal_mismatch")
    if str(quote.get("coupon_discount", "")) != str(coupon_discount):
        raise HTTPException(status_code=400, detail="quote_discount_mismatch")
    if str(quote.get("balance_used", "")) != str(balance_used):
        raise HTTPException(status_code=400, detail="quote_balance_mismatch")
    if bool(quote.get("is_full_payment", False)) != bool(is_full_payment):
        raise HTTPException(status_code=400, detail="quote_payment_mode_mismatch")
    quote_jti = str(quote.get("jti", "")).strip()
    if not quote_jti:
        raise HTTPException(status_code=400, detail="quote_missing_jti")

    try:
        client_submit_token = normalize_checkout_submit_token(payload.get("client_submit_token"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if str(quote.get("client_submit_token", "")) != client_submit_token:
        raise HTTPException(status_code=400, detail="quote_submit_token_mismatch")

    submit_event_id = build_checkout_submit_event_id(customer_id, client_submit_token)
    try:
        db.add(ProcessedWebhookEvent(event_id=submit_event_id, provider="checkout_submit"))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="duplicate_checkout_submission")

    if db.query(ProcessedWebhookEvent).filter_by(event_id=quote_jti, provider="checkout_quote").first():
        raise HTTPException(status_code=409, detail="quote_replay_detected")
    db.add(ProcessedWebhookEvent(event_id=quote_jti, provider="checkout_quote"))
    db.commit()
    
    if is_full_payment:
        # Schema C: Direct Order
        res = payment_service.create_final_order_direct(customer_id, sanitized_items, balance_used, referral_code)
    else:
        # Schema B: Draft Order
        res = payment_service.create_draft_order(
            customer_id, 
            sanitized_items, 
            balance_used, 
            referral_code,
            email=current_user.email,
            extra_discount=coupon_discount
        )

    payment_service.close()
    if isinstance(res, dict):
        res["server_subtotal"] = float(subtotal)
        res["coupon_discount"] = float(coupon_discount)
        res["validated_discount_codes"] = coupon_eval.get("selected", {}).get("valid_codes", [])
        res["server_final_due"] = float(guard["final_due"])
    return res


@router.post("/payment/quote")
def create_checkout_quote(
    payload: CheckoutQuoteRequest,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    try:
        client_submit_token = normalize_checkout_submit_token(payload.client_submit_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    ctx = _prepare_checkout_context(db=db, payload=payload.dict(), customer_id=current_user.customer_id)
    jti = str(uuid.uuid4())
    exp_ts = int(time.time()) + 300
    quote_payload = {
        "jti": jti,
        "user_id": current_user.customer_id,
        "exp": exp_ts,
        "item_fingerprint": ctx["item_fingerprint"],
        "subtotal": str(ctx["subtotal"]),
        "coupon_discount": str(ctx["coupon_discount"]),
        "balance_used": str(ctx["balance_used"]),
        "is_full_payment": bool(ctx["is_full_payment"]),
        "client_submit_token": client_submit_token,
        "validated_discount_codes": ctx["coupon_eval"].get("selected", {}).get("valid_codes", []),
    }
    token = sign_checkout_quote(quote_payload, settings.SECRET_KEY)
    return {
        "status": "success",
        "quote_token": token,
        "expires_in_seconds": 300,
        "summary": {
            "subtotal": float(ctx["subtotal"]),
            "coupon_discount": float(ctx["coupon_discount"]),
            "balance_used": float(ctx["balance_used"]),
            "final_due": float(ctx["guard"]["final_due"]),
            "validated_discount_codes": quote_payload["validated_discount_codes"],
        },
    }

@router.post("/smart/price-hunting")
def add_price_hunting(
    payload: Dict[str, Any], 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.7.0: User subscribes to a wish price (Price Radar).
    """
    service = SmartBusinessService(db)
    return service.add_price_wish(
        user_id=current_user.customer_id,
        product_id=payload["product_id"],
        wish_price=payload["wish_price"]
    )

@router.get("/smart/scan-radar")
async def trigger_price_radar_scan(
    db: Session = Depends(get_db),
    admin: UserExt = Depends(get_current_admin)
):
    """
    Admin-only: Manually trigger price radar scanning.
    (In prod, this runs on a Cron Job).
    """
    service = SmartBusinessService(db)
    await service.scan_price_wishes()
    return {"status": "success", "message": "Price radar scan complete."}
