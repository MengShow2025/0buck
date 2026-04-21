from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.butler import UserButlerProfile


def _ensure_profile(db: Session, user_id: int) -> UserButlerProfile:
    profile = db.query(UserButlerProfile).filter_by(user_id=user_id).first()
    if not profile:
        profile = UserButlerProfile(user_id=user_id)
        db.add(profile)
        db.flush()
    if not isinstance(profile.personality, dict):
        profile.personality = {}
    if "recommendation_prefs" not in profile.personality:
        profile.personality["recommendation_prefs"] = {}
    return profile


def is_recommendation_enabled(db: Session, user_id: int) -> bool:
    profile = _ensure_profile(db, user_id)
    prefs = profile.personality.get("recommendation_prefs", {})
    return bool(prefs.get("enabled", True))


def set_recommendation_enabled(db: Session, user_id: int, enabled: bool) -> None:
    profile = _ensure_profile(db, user_id)
    prefs = profile.personality.get("recommendation_prefs", {})
    prefs["enabled"] = bool(enabled)
    profile.personality["recommendation_prefs"] = prefs
    db.commit()


def mark_session_skip(db: Session, user_id: int, session_id: str, minutes: int = 30) -> None:
    profile = _ensure_profile(db, user_id)
    prefs = profile.personality.get("recommendation_prefs", {})
    until = datetime.utcnow() + timedelta(minutes=max(1, minutes))
    session_skips = prefs.get("session_skips", {})
    session_skips[session_id] = until.isoformat()
    prefs["session_skips"] = session_skips
    profile.personality["recommendation_prefs"] = prefs
    db.commit()


def can_recommend_now(db: Session, user_id: int, session_id: Optional[str] = None) -> bool:
    if not is_recommendation_enabled(db, user_id):
        return False
    if not session_id:
        return True
    profile = _ensure_profile(db, user_id)
    prefs = profile.personality.get("recommendation_prefs", {})
    session_skips = prefs.get("session_skips", {})
    raw_until = session_skips.get("global") or session_skips.get(session_id)
    if not raw_until:
        return True
    try:
        return datetime.utcnow() >= datetime.fromisoformat(raw_until)
    except Exception:
        return True
