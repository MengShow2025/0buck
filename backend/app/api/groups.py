from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.ledger import ChatGroup, ChatGroupAuditLog, ChatGroupMember, ChatGroupMemberSetting, UserExt
from app.services.stream_chat import stream_chat_service

router = APIRouter()


class CreateGroupPayload(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    avatar_url: Optional[str] = None
    group_type: str = "private"
    member_user_ids: List[int] = []


class InvitePayload(BaseModel):
    user_ids: List[int]


class RolePayload(BaseModel):
    role: str


class SettingsPayload(BaseModel):
    name: Optional[str] = None
    announcement: Optional[str] = None
    join_policy: Optional[str] = None
    everyone_can_invite: Optional[bool] = None
    mute_all: Optional[bool] = None


class TransferOwnerPayload(BaseModel):
    new_owner_user_id: int


class PinMessagePayload(BaseModel):
    message_id: str
    title: Optional[str] = None
    content: Optional[str] = None
    sender: Optional[str] = None
    time: Optional[str] = None


class MemberMutePayload(BaseModel):
    minutes: int = 30


class RecommendationPayload(BaseModel):
    title: str = "群主推荐"
    link: str
    subtitle: Optional[str] = None


class MySettingPayload(BaseModel):
    self_remark: Optional[str] = None
    self_nickname: Optional[str] = None
    mute_notification: Optional[bool] = None
    pin_chat: Optional[bool] = None
    show_member_alias: Optional[bool] = None


def _require_group_member(db: Session, group_id: int, user_id: int) -> ChatGroupMember:
    row = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id,
        ChatGroupMember.state == "active",
    ).first()
    if not row:
        raise HTTPException(status_code=403, detail="not_group_member")
    return row


def _require_role(member: ChatGroupMember, allowed: List[str]) -> None:
    if member.role not in allowed:
        raise HTTPException(status_code=403, detail="insufficient_role")


def _audit(db: Session, group_id: int, actor: int, action: str, target_user_id: Optional[int] = None, payload: Optional[Dict[str, Any]] = None):
    db.add(
        ChatGroupAuditLog(
            group_id=group_id,
            actor_user_id=actor,
            action=action,
            target_user_id=target_user_id,
            payload=payload or {},
        )
    )


def can_member_post_message(role: str, mute_all: bool, muted_until: Optional[datetime], now: Optional[datetime] = None) -> bool:
    if role in {"owner", "admin"}:
        return True
    if mute_all:
        return False
    if muted_until is None:
        return True
    ref = now or datetime.now(timezone.utc)
    if muted_until.tzinfo is None:
        muted_until = muted_until.replace(tzinfo=timezone.utc)
    return muted_until <= ref


DEFAULT_SALON_GROUPS = [
    {"stream_channel_id": "default_salon_official", "name": "官方播报", "group_type": "public", "default_join_role": "admin"},
    {"stream_channel_id": "default_salon_city", "name": "约同城群", "group_type": "public", "default_join_role": "admin"},
    {"stream_channel_id": "default_salon_digital", "name": "数码出海群", "group_type": "public", "default_join_role": "admin"},
]


@router.get("")
def list_groups(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    rows = (
        db.query(ChatGroup, ChatGroupMember)
        .join(ChatGroupMember, ChatGroupMember.group_id == ChatGroup.id)
        .filter(
            ChatGroupMember.user_id == current_user.customer_id,
            ChatGroupMember.state == "active",
            ChatGroup.status == "active",
        )
        .all()
    )
    items = [
        {
            "id": g.id,
            "name": g.name,
            "avatar_url": g.avatar_url,
            "group_type": g.group_type,
            "role": m.role,
            "stream_channel_type": g.stream_channel_type,
            "stream_channel_id": g.stream_channel_id,
        }
        for g, m in rows
    ]
    return {"status": "success", "items": items}


@router.post("/bootstrap-defaults")
def bootstrap_default_groups(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    joined: List[Dict[str, Any]] = []
    for spec in DEFAULT_SALON_GROUPS:
        group = db.query(ChatGroup).filter(ChatGroup.stream_channel_id == spec["stream_channel_id"]).first()
        created_now = False
        if not group:
            group = ChatGroup(
                stream_channel_type="messaging",
                stream_channel_id=spec["stream_channel_id"],
                name=spec["name"],
                avatar_url=f"https://ui-avatars.com/api/?name={spec['name'][:8]}&background=random",
                owner_id=current_user.customer_id,
                group_type=spec["group_type"],
                status="active",
                settings={"announcement": "", "join_policy": "free", "everyone_can_invite": True, "mute_all": False},
            )
            db.add(group)
            db.flush()
            db.add(ChatGroupMember(group_id=group.id, user_id=current_user.customer_id, role="owner", state="active"))
            _audit(db, group.id, current_user.customer_id, "group_bootstrap_create")
            created_now = True
        else:
            default_role = spec.get("default_join_role", "member")
            member = db.query(ChatGroupMember).filter(
                ChatGroupMember.group_id == group.id,
                ChatGroupMember.user_id == current_user.customer_id,
            ).first()
            if not member:
                db.add(ChatGroupMember(group_id=group.id, user_id=current_user.customer_id, role=default_role, state="active"))
                _audit(db, group.id, current_user.customer_id, "group_bootstrap_join")
            elif member.state != "active":
                member.state = "active"
                if member.role == "member" and default_role == "admin":
                    member.role = "admin"
                _audit(db, group.id, current_user.customer_id, "group_bootstrap_rejoin")
            elif member.role == "member" and default_role == "admin":
                member.role = "admin"
                _audit(db, group.id, current_user.customer_id, "group_bootstrap_upgrade_admin")

        joined.append({"id": group.id, "name": group.name, "stream_channel_id": group.stream_channel_id})
        db.commit()

        try:
            if created_now:
                stream_chat_service.create_channel(
                    group.stream_channel_type,
                    group.stream_channel_id,
                    group.name,
                    [f"u_{current_user.customer_id}"],
                    {"group_id": str(group.id), "owner_id": str(group.owner_id)},
                )
            else:
                stream_chat_service.add_members(group.stream_channel_type, group.stream_channel_id, [f"u_{current_user.customer_id}"])
        except Exception:
            pass

    return {"status": "success", "items": joined}


@router.post("")
def create_group(
    payload: CreateGroupPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    member_ids = sorted({int(x) for x in (payload.member_user_ids or []) if int(x) != current_user.customer_id})
    gid_seed = f"grp_{current_user.customer_id}_{abs(hash((payload.name, tuple(member_ids)))) % 10_000_000}"
    group = ChatGroup(
        stream_channel_type="messaging",
        stream_channel_id=gid_seed,
        name=payload.name.strip(),
        avatar_url=payload.avatar_url,
        owner_id=current_user.customer_id,
        group_type=payload.group_type if payload.group_type in {"private", "public"} else "private",
        status="active",
        settings={"announcement": "", "join_policy": "approval", "everyone_can_invite": False, "mute_all": False},
    )
    db.add(group)
    db.flush()

    db.add(ChatGroupMember(group_id=group.id, user_id=current_user.customer_id, role="owner", state="active"))
    for uid in member_ids:
        db.add(ChatGroupMember(group_id=group.id, user_id=uid, role="member", state="active"))
    _audit(db, group.id, current_user.customer_id, "group_create", payload={"member_count": len(member_ids) + 1})
    db.commit()
    db.refresh(group)

    try:
        stream_chat_service.create_channel(
            group.stream_channel_type,
            group.stream_channel_id,
            group.name,
            [f"u_{current_user.customer_id}"] + [f"u_{uid}" for uid in member_ids],
            {"group_id": str(group.id), "owner_id": str(current_user.customer_id)},
        )
    except Exception:
        pass
    return {"status": "success", "group_id": group.id}


@router.get("/{group_id}/members")
def list_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    _require_group_member(db, group_id, current_user.customer_id)
    rows = (
        db.query(ChatGroupMember, UserExt)
        .join(UserExt, UserExt.customer_id == ChatGroupMember.user_id)
        .filter(ChatGroupMember.group_id == group_id, ChatGroupMember.state == "active")
        .all()
    )
    items = [
        {
            "user_id": u.customer_id,
            "name": (u.nickname or u.email),
            "role": m.role,
            "muted_until": m.muted_until,
        }
        for m, u in rows
    ]
    return {"status": "success", "items": items}


@router.get("/{group_id}")
def get_group_detail(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    me = _require_group_member(db, group_id, current_user.customer_id)
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group_not_found")
    return {
        "status": "success",
        "item": {
            "id": group.id,
            "name": group.name,
            "avatar_url": group.avatar_url,
            "group_type": group.group_type,
            "status": group.status,
            "settings": group.settings or {},
            "owner_id": group.owner_id,
            "my_role": me.role,
            "stream_channel_type": group.stream_channel_type,
            "stream_channel_id": group.stream_channel_id,
        },
    }


@router.post("/{group_id}/members/invite")
def invite_members(
    group_id: int,
    payload: InvitePayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    actor = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(actor, ["owner", "admin"])
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group or group.status != "active":
        raise HTTPException(status_code=404, detail="group_not_found")

    added: List[int] = []
    for uid in sorted({int(x) for x in payload.user_ids or []}):
        exists = db.query(ChatGroupMember).filter(
            ChatGroupMember.group_id == group_id,
            ChatGroupMember.user_id == uid,
            ChatGroupMember.state == "active",
        ).first()
        if exists:
            continue
        db.add(ChatGroupMember(group_id=group_id, user_id=uid, role="member", state="active"))
        _audit(db, group_id, current_user.customer_id, "member_invite", target_user_id=uid)
        added.append(uid)
    db.commit()

    if added:
        try:
            stream_chat_service.add_members(group.stream_channel_type, group.stream_channel_id, [f"u_{uid}" for uid in added])
        except Exception:
            pass
    return {"status": "success", "added_user_ids": added}


@router.post("/{group_id}/members/{user_id}/role")
def update_member_role(
    group_id: int,
    user_id: int,
    payload: RolePayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    actor = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(actor, ["owner"])
    if payload.role not in {"owner", "admin", "member"}:
        raise HTTPException(status_code=400, detail="invalid_role")
    target = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id,
        ChatGroupMember.state == "active",
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="member_not_found")
    target.role = payload.role
    _audit(db, group_id, current_user.customer_id, "member_role_change", target_user_id=user_id, payload={"role": payload.role})
    db.commit()
    return {"status": "success"}


@router.delete("/{group_id}/members/{user_id}")
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    actor = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(actor, ["owner", "admin"])
    target = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id,
        ChatGroupMember.state == "active",
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="member_not_found")
    if target.role == "owner":
        raise HTTPException(status_code=400, detail="cannot_remove_owner")
    target.state = "removed"
    _audit(db, group_id, current_user.customer_id, "member_remove", target_user_id=user_id)
    db.commit()
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if group:
        try:
            stream_chat_service.remove_members(group.stream_channel_type, group.stream_channel_id, [f"u_{user_id}"])
        except Exception:
            pass
    return {"status": "success"}


@router.patch("/{group_id}/settings")
def update_settings(
    group_id: int,
    payload: SettingsPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    actor = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(actor, ["owner", "admin"])
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id, ChatGroup.status == "active").first()
    if not group:
        raise HTTPException(status_code=404, detail="group_not_found")
    settings = dict(group.settings or {})
    patch = payload.model_dump(exclude_none=True)
    group_name = patch.pop("name", None)
    if group_name is not None:
        cleaned = str(group_name).strip()[:120]
        if not cleaned:
            raise HTTPException(status_code=400, detail="invalid_group_name")
        group.name = cleaned
    settings.update(patch)
    group.settings = settings
    _audit(db, group_id, current_user.customer_id, "group_settings_update", payload=patch)
    db.commit()
    try:
        stream_chat_service.update_channel(group.stream_channel_type, group.stream_channel_id, {"settings": settings, "name": group.name})
    except Exception:
        pass
    return {"status": "success", "settings": settings, "name": group.name}


@router.get("/{group_id}/me-settings")
def get_my_settings(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    _require_group_member(db, group_id, current_user.customer_id)
    row = db.query(ChatGroupMemberSetting).filter(
        ChatGroupMemberSetting.group_id == group_id,
        ChatGroupMemberSetting.user_id == current_user.customer_id,
    ).first()
    if not row:
        return {
            "status": "success",
            "item": {
                "self_remark": "",
                "self_nickname": "",
                "mute_notification": False,
                "pin_chat": False,
                "show_member_alias": True,
            },
        }
    return {
        "status": "success",
        "item": {
            "self_remark": row.self_remark or "",
            "self_nickname": row.self_nickname or "",
            "mute_notification": bool(row.mute_notification),
            "pin_chat": bool(row.pin_chat),
            "show_member_alias": bool(row.show_member_alias),
        },
    }


@router.put("/{group_id}/me-settings")
def update_my_settings(
    group_id: int,
    payload: MySettingPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    _require_group_member(db, group_id, current_user.customer_id)
    row = db.query(ChatGroupMemberSetting).filter(
        ChatGroupMemberSetting.group_id == group_id,
        ChatGroupMemberSetting.user_id == current_user.customer_id,
    ).first()
    if not row:
        row = ChatGroupMemberSetting(group_id=group_id, user_id=current_user.customer_id)
        db.add(row)
    patch = payload.model_dump(exclude_none=True)
    if "self_remark" in patch:
        row.self_remark = str(patch["self_remark"] or "")[:255]
    if "self_nickname" in patch:
        row.self_nickname = str(patch["self_nickname"] or "")[:100]
    if "mute_notification" in patch:
        row.mute_notification = bool(patch["mute_notification"])
    if "pin_chat" in patch:
        row.pin_chat = bool(patch["pin_chat"])
    if "show_member_alias" in patch:
        row.show_member_alias = bool(patch["show_member_alias"])
    db.commit()
    return {"status": "success"}


@router.post("/{group_id}/mute-all")
def set_mute_all(
    group_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    me = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(me, ["owner", "admin"])
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id, ChatGroup.status == "active").first()
    if not group:
        raise HTTPException(status_code=404, detail="group_not_found")
    enabled = bool(payload.get("enabled", True))
    settings = dict(group.settings or {})
    settings["mute_all"] = enabled
    group.settings = settings
    _audit(db, group_id, current_user.customer_id, "group_mute_all", payload={"enabled": enabled})
    db.commit()
    return {"status": "success", "mute_all": enabled}


@router.post("/{group_id}/members/{user_id}/mute")
def mute_member(
    group_id: int,
    user_id: int,
    payload: MemberMutePayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    me = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(me, ["owner", "admin"])
    target = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id,
        ChatGroupMember.state == "active",
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="member_not_found")
    if target.role == "owner":
        raise HTTPException(status_code=400, detail="cannot_mute_owner")
    minutes = max(0, min(int(payload.minutes or 0), 7 * 24 * 60))
    target.muted_until = None if minutes == 0 else datetime.utcnow() + timedelta(minutes=minutes)
    _audit(
        db,
        group_id,
        current_user.customer_id,
        "member_mute",
        target_user_id=user_id,
        payload={"minutes": minutes},
    )
    db.commit()
    return {"status": "success", "muted_until": target.muted_until}


@router.post("/{group_id}/leave")
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    member = _require_group_member(db, group_id, current_user.customer_id)
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="owner_must_transfer_or_dissolve")
    member.state = "left"
    _audit(db, group_id, current_user.customer_id, "group_leave")
    db.commit()
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if group:
        try:
            stream_chat_service.remove_members(group.stream_channel_type, group.stream_channel_id, [f"u_{current_user.customer_id}"])
        except Exception:
            pass
    return {"status": "success"}


@router.post("/{group_id}/transfer-owner")
def transfer_owner(
    group_id: int,
    payload: TransferOwnerPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    actor = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(actor, ["owner"])
    if int(payload.new_owner_user_id) == current_user.customer_id:
        raise HTTPException(status_code=400, detail="same_owner")
    target = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == int(payload.new_owner_user_id),
        ChatGroupMember.state == "active",
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="target_not_member")
    actor.role = "admin"
    target.role = "owner"
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if group:
        group.owner_id = int(payload.new_owner_user_id)
    _audit(
        db,
        group_id,
        current_user.customer_id,
        "group_transfer_owner",
        target_user_id=int(payload.new_owner_user_id),
    )
    db.commit()
    return {"status": "success"}


@router.delete("/{group_id}")
def dissolve_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    actor = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(actor, ["owner"])
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="group_not_found")
    group.status = "dissolved"
    db.query(ChatGroupMember).filter(ChatGroupMember.group_id == group_id, ChatGroupMember.state == "active").update(
        {ChatGroupMember.state: "removed"}, synchronize_session=False
    )
    _audit(db, group_id, current_user.customer_id, "group_dissolve")
    db.commit()
    return {"status": "success"}


@router.get("/{group_id}/audit-logs")
def list_audit_logs(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    me = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(me, ["owner", "admin"])
    rows = (
        db.query(ChatGroupAuditLog)
        .filter(ChatGroupAuditLog.group_id == group_id)
        .order_by(ChatGroupAuditLog.created_at.desc())
        .limit(200)
        .all()
    )
    return {
        "status": "success",
        "items": [
            {
                "id": r.id,
                "actor_user_id": r.actor_user_id,
                "action": r.action,
                "target_user_id": r.target_user_id,
                "payload": r.payload or {},
                "created_at": r.created_at,
            }
            for r in rows
        ],
    }


@router.post("/{group_id}/pin-message")
def pin_message(
    group_id: int,
    payload: PinMessagePayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    me = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(me, ["owner", "admin"])
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id, ChatGroup.status == "active").first()
    if not group:
        raise HTTPException(status_code=404, detail="group_not_found")
    settings = dict(group.settings or {})
    settings["pinned_message"] = {
        "message_id": payload.message_id,
        "title": payload.title or "Pinned Message",
        "content": (payload.content or "")[:240],
        "sender": payload.sender or "",
        "time": payload.time or "",
    }
    group.settings = settings
    _audit(db, group_id, current_user.customer_id, "pin_message", payload={"message_id": payload.message_id})
    db.commit()
    try:
        stream_chat_service.update_channel(group.stream_channel_type, group.stream_channel_id, {"settings": settings})
    except Exception:
        pass
    return {"status": "success", "pinned_message": settings["pinned_message"]}


@router.delete("/{group_id}/pin-message/{message_id}")
def unpin_message(
    group_id: int,
    message_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    me = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(me, ["owner", "admin"])
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id, ChatGroup.status == "active").first()
    if not group:
        raise HTTPException(status_code=404, detail="group_not_found")
    settings = dict(group.settings or {})
    pinned = settings.get("pinned_message") or {}
    if str(pinned.get("message_id")) == str(message_id):
      settings.pop("pinned_message", None)
      group.settings = settings
      _audit(db, group_id, current_user.customer_id, "unpin_message", payload={"message_id": message_id})
      db.commit()
      try:
          stream_chat_service.update_channel(group.stream_channel_type, group.stream_channel_id, {"settings": settings})
      except Exception:
          pass
    return {"status": "success"}


@router.post("/{group_id}/recommendation")
def set_group_recommendation(
    group_id: int,
    payload: RecommendationPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    me = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(me, ["owner", "admin"])
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id, ChatGroup.status == "active").first()
    if not group:
        raise HTTPException(status_code=404, detail="group_not_found")
    link = str(payload.link or "").strip()
    if not link:
        raise HTTPException(status_code=400, detail="empty_link")
    settings = dict(group.settings or {})
    settings["pinned_message"] = {
        "message_id": f"recommend-{int(datetime.utcnow().timestamp())}",
        "title": str(payload.title or "群主推荐")[:40],
        "content": str(payload.subtitle or "群主/管理员推荐商品")[:240],
        "link": link,
        "sender": "group_owner",
        "time": "",
    }
    group.settings = settings
    _audit(db, group_id, current_user.customer_id, "set_recommendation", payload={"link": link})
    db.commit()
    return {"status": "success", "recommendation": settings["pinned_message"]}


@router.delete("/{group_id}/recommendation")
def clear_group_recommendation(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    me = _require_group_member(db, group_id, current_user.customer_id)
    _require_role(me, ["owner", "admin"])
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id, ChatGroup.status == "active").first()
    if not group:
        raise HTTPException(status_code=404, detail="group_not_found")
    settings = dict(group.settings or {})
    settings.pop("pinned_message", None)
    group.settings = settings
    _audit(db, group_id, current_user.customer_id, "clear_recommendation")
    db.commit()
    return {"status": "success"}
