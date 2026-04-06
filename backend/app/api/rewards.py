from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional
from decimal import Decimal
from datetime import datetime

from app.db.session import get_db
from app.models.ledger import CheckinPlan, GroupBuyCampaign, Order
from app.services.rewards import RewardsService
from app.services.shopify_refunds import ShopifyRefundError, refund_order_full


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


def _normalize_plan_status(status: str) -> str:
    if status in {"pending_choice", "active_checkin", "active_groupbuy"}:
        return "active"
    if status in {"completed", "free_refunded", "forfeited"}:
        return status
    return status


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

@router.post("/payment/pre-check")
def payment_pre_check(
    payload: Dict[str, Any], 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.5.0: Pre-check inventory and freeze balance before Draft Order creation.
    """
    customer_id = current_user.customer_id
    items = payload.get("items", [])
    balance_to_use = Decimal(str(payload.get("balance_to_use", "0")))
    
    if balance_to_use > 0:
        rewards = RewardsService(db, current_user_id=customer_id)
        # Attempt to freeze balance
        success = rewards.freeze_balance(customer_id, balance_to_use, "PENDING_ORDER")
        if not success:
            raise HTTPException(status_code=400, detail="Insufficient balance or freeze failed")
            
    return {"status": "success", "message": "Balance frozen, proceed to order creation"}

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
    items = payload.get("items", [])
    balance_used = Decimal(str(payload.get("balance_used", "0")))
    referral_code = payload.get("referral_code")
    
    # Calculate Total from Price Firewall logic (simplified here as we call service)
    # Service will do the actual firewalling
    
    if payload.get("is_full_payment"):
        # Schema C: Direct Order
        res = payment_service.create_final_order_direct(customer_id, items, balance_used, referral_code)
    else:
        # Schema B: Draft Order
        res = payment_service.create_draft_order(customer_id, items, balance_used, referral_code)
        
    payment_service.close()
    return res
