from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.ledger import FriendBlock, FriendRequest, Friendship, UserExt

router = APIRouter()


class FriendRequestCreate(BaseModel):
    target_user_id: int
    message: Optional[str] = None


def _friend_exists(db: Session, a: int, b: int) -> bool:
    row = db.query(Friendship).filter(
        Friendship.user_id == a,
        Friendship.friend_id == b,
        Friendship.status == "active",
    ).first()
    return row is not None


def _is_blocked(db: Session, a: int, b: int) -> bool:
    return db.query(FriendBlock).filter(
        FriendBlock.user_id == a,
        FriendBlock.blocked_user_id == b,
    ).first() is not None


def _is_blocked_either_side(db: Session, a: int, b: int) -> bool:
    return _is_blocked(db, a, b) or _is_blocked(db, b, a)


@router.get("/search")
def search_users(
    q: str = "",
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    query = (q or "").strip()
    if not query:
        return {"status": "success", "items": []}
    rows = (
        db.query(UserExt)
        .filter(
            UserExt.customer_id != current_user.customer_id,
            or_(
                UserExt.nickname.ilike(f"%{query}%"),
                UserExt.email.ilike(f"%{query}%"),
                UserExt.first_name.ilike(f"%{query}%"),
                UserExt.last_name.ilike(f"%{query}%"),
            ),
        )
        .limit(20)
        .all()
    )
    items = []
    for u in rows:
        relation = "none"
        if _friend_exists(db, current_user.customer_id, u.customer_id):
            relation = "friend"
        elif db.query(FriendBlock).filter(
            FriendBlock.user_id == current_user.customer_id,
            FriendBlock.blocked_user_id == u.customer_id,
        ).first():
            relation = "blocked"
        elif db.query(FriendRequest).filter(
            FriendRequest.requester_id == current_user.customer_id,
            FriendRequest.recipient_id == u.customer_id,
            FriendRequest.status == "pending",
        ).first():
            relation = "pending_out"
        elif db.query(FriendRequest).filter(
            FriendRequest.requester_id == u.customer_id,
            FriendRequest.recipient_id == current_user.customer_id,
            FriendRequest.status == "pending",
        ).first():
            relation = "pending_in"

        items.append(
            {
                "id": u.customer_id,
                "name": (u.nickname or f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email),
                "email": u.email,
                "avatar": f"https://ui-avatars.com/api/?name={((u.nickname or u.email)[:24])}&background=random",
                "relation": relation,
            }
        )
    return {"status": "success", "items": items}


@router.post("/requests")
def create_friend_request(
    payload: FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    target_id = int(payload.target_user_id)
    if target_id == current_user.customer_id:
        raise HTTPException(status_code=400, detail="cannot_add_self")
    target = db.query(UserExt).filter(UserExt.customer_id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="target_not_found")
    if _is_blocked_either_side(db, current_user.customer_id, target_id):
        raise HTTPException(status_code=403, detail="blocked_relationship")
    if _friend_exists(db, current_user.customer_id, target_id):
        return {"status": "success", "message": "already_friends"}

    existing = db.query(FriendRequest).filter(
        FriendRequest.requester_id == current_user.customer_id,
        FriendRequest.recipient_id == target_id,
        FriendRequest.status == "pending",
    ).first()
    if existing:
        return {"status": "success", "request_id": existing.id, "message": "already_pending"}

    reverse_pending = db.query(FriendRequest).filter(
        FriendRequest.requester_id == target_id,
        FriendRequest.recipient_id == current_user.customer_id,
        FriendRequest.status == "pending",
    ).first()
    if reverse_pending:
        reverse_pending.status = "accepted"
        if not _friend_exists(db, current_user.customer_id, target_id):
            db.add(Friendship(user_id=current_user.customer_id, friend_id=target_id, status="active"))
        if not _friend_exists(db, target_id, current_user.customer_id):
            db.add(Friendship(user_id=target_id, friend_id=current_user.customer_id, status="active"))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return {"status": "success", "message": "already_friends"}
        return {"status": "success", "request_id": reverse_pending.id, "message": "auto_accepted"}

    req = FriendRequest(
        requester_id=current_user.customer_id,
        recipient_id=target_id,
        message=(payload.message or "").strip()[:255] or "I'd like to add you as a friend.",
        status="pending",
    )
    db.add(req)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing_after = db.query(FriendRequest).filter(
            FriendRequest.requester_id == current_user.customer_id,
            FriendRequest.recipient_id == target_id,
            FriendRequest.status == "pending",
        ).first()
        if existing_after:
            return {"status": "success", "request_id": existing_after.id, "message": "already_pending"}
        if _friend_exists(db, current_user.customer_id, target_id):
            return {"status": "success", "message": "already_friends"}
        raise
    db.refresh(req)
    return {"status": "success", "request_id": req.id}


@router.get("/requests")
def list_incoming_requests(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    rows = (
        db.query(FriendRequest, UserExt)
        .join(UserExt, UserExt.customer_id == FriendRequest.requester_id)
        .filter(
            FriendRequest.recipient_id == current_user.customer_id,
            FriendRequest.status == "pending",
        )
        .order_by(FriendRequest.created_at.desc())
        .all()
    )
    items = [
        {
            "id": r.id,
            "name": (u.nickname or f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email),
            "message": r.message or "",
            "avatar": f"https://ui-avatars.com/api/?name={((u.nickname or u.email)[:24])}&background=random",
            "requester_id": u.customer_id,
        }
        for r, u in rows
    ]
    return {"status": "success", "items": items}


@router.post("/requests/{request_id}/accept")
def accept_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    req = db.query(FriendRequest).filter(FriendRequest.id == request_id).first()
    if not req or req.recipient_id != current_user.customer_id:
        raise HTTPException(status_code=404, detail="request_not_found")
    if req.status != "pending":
        return {"status": "success", "message": "already_processed"}
    if _is_blocked_either_side(db, req.requester_id, req.recipient_id):
        raise HTTPException(status_code=403, detail="blocked_relationship")

    req.status = "accepted"
    if not _friend_exists(db, req.requester_id, req.recipient_id):
        db.add(Friendship(user_id=req.requester_id, friend_id=req.recipient_id, status="active"))
    if not _friend_exists(db, req.recipient_id, req.requester_id):
        db.add(Friendship(user_id=req.recipient_id, friend_id=req.requester_id, status="active"))
    reverse_pending = db.query(FriendRequest).filter(
        FriendRequest.requester_id == req.recipient_id,
        FriendRequest.recipient_id == req.requester_id,
        FriendRequest.status == "pending",
    ).all()
    for r in reverse_pending:
        r.status = "accepted"
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if _friend_exists(db, req.requester_id, req.recipient_id) and _friend_exists(db, req.recipient_id, req.requester_id):
            return {"status": "success", "message": "already_friends"}
        raise
    return {"status": "success"}


@router.post("/requests/{request_id}/ignore")
def ignore_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    req = db.query(FriendRequest).filter(FriendRequest.id == request_id).first()
    if not req or req.recipient_id != current_user.customer_id:
        raise HTTPException(status_code=404, detail="request_not_found")
    if req.status == "pending":
        req.status = "ignored"
        db.commit()
    return {"status": "success"}


@router.get("")
def list_friends(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    rows = (
        db.query(Friendship, UserExt)
        .join(UserExt, UserExt.customer_id == Friendship.friend_id)
        .filter(
            Friendship.user_id == current_user.customer_id,
            Friendship.status == "active",
        )
        .order_by(Friendship.created_at.desc())
        .all()
    )
    items = [
        {
            "id": u.customer_id,
            "name": (u.nickname or f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email),
            "avatar": f"https://ui-avatars.com/api/?name={((u.nickname or u.email)[:24])}&background=random",
        }
        for _, u in rows
    ]
    return {"status": "success", "items": items}


@router.delete("/{friend_user_id}")
def remove_friend(
    friend_user_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    db.query(Friendship).filter(
        Friendship.user_id == current_user.customer_id,
        Friendship.friend_id == friend_user_id,
    ).delete()
    db.query(Friendship).filter(
        Friendship.user_id == friend_user_id,
        Friendship.friend_id == current_user.customer_id,
    ).delete()
    db.commit()
    return {"status": "success"}


@router.get("/blocked")
def list_blocked(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    rows = (
        db.query(FriendBlock, UserExt)
        .join(UserExt, UserExt.customer_id == FriendBlock.blocked_user_id)
        .filter(FriendBlock.user_id == current_user.customer_id)
        .order_by(FriendBlock.created_at.desc())
        .all()
    )
    items = [
        {
            "id": u.customer_id,
            "name": (u.nickname or f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email),
            "avatar": f"https://ui-avatars.com/api/?name={((u.nickname or u.email)[:24])}&background=random",
        }
        for _, u in rows
    ]
    return {"status": "success", "items": items}


@router.post("/{friend_user_id}/block")
def block_friend(
    friend_user_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    if friend_user_id == current_user.customer_id:
        raise HTTPException(status_code=400, detail="cannot_block_self")
    target = db.query(UserExt).filter(UserExt.customer_id == friend_user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="target_not_found")
    exists = db.query(FriendBlock).filter(
        FriendBlock.user_id == current_user.customer_id,
        FriendBlock.blocked_user_id == friend_user_id,
    ).first()
    if not exists:
        db.add(FriendBlock(user_id=current_user.customer_id, blocked_user_id=friend_user_id))
        db.query(Friendship).filter(
            Friendship.user_id == current_user.customer_id,
            Friendship.friend_id == friend_user_id,
        ).delete()
        db.query(Friendship).filter(
            Friendship.user_id == friend_user_id,
            Friendship.friend_id == current_user.customer_id,
        ).delete()
        db.query(FriendRequest).filter(
            or_(
                and_(
                    FriendRequest.requester_id == current_user.customer_id,
                    FriendRequest.recipient_id == friend_user_id,
                    FriendRequest.status == "pending",
                ),
                and_(
                    FriendRequest.requester_id == friend_user_id,
                    FriendRequest.recipient_id == current_user.customer_id,
                    FriendRequest.status == "pending",
                ),
            )
        ).update({"status": "canceled"}, synchronize_session=False)
        db.commit()
    return {"status": "success"}


@router.delete("/{friend_user_id}/block")
def unblock_friend(
    friend_user_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    db.query(FriendBlock).filter(
        FriendBlock.user_id == current_user.customer_id,
        FriendBlock.blocked_user_id == friend_user_id,
    ).delete()
    db.commit()
    return {"status": "success"}
