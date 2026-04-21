import uuid
from typing import Any, Dict, List, Optional
import time
import html as html_lib
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.ledger import ActivityCommentReply, Comment, FriendBlock, Friendship, SquareActivity, SquareActivityLike, UserExt

router = APIRouter()


class MediaUploadTicketPayload(BaseModel):
    file_name: str
    mime_type: str
    file_size: int


class MediaCommitPayload(BaseModel):
    cdn_url: str
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    size: Optional[int] = None


class ActivityCreatePayload(BaseModel):
    content: str = ""
    visibility: str = "public"  # public/friends
    media: List[Dict[str, Any]] = []


class OfficialActivityCreatePayload(BaseModel):
    content: str = ""
    visibility: str = "public"
    media: List[Dict[str, Any]] = []
    official_type: str = "activity"  # activity/topic
    pinned: bool = False


class PinActivityPayload(BaseModel):
    pinned: bool


class CommentPayload(BaseModel):
    content: str
    parent_comment_id: Optional[str] = None


def _friend_ids(db: Session, user_id: int) -> set[int]:
    rows = db.query(Friendship).filter(
        Friendship.user_id == user_id,
        Friendship.status == "active",
    ).all()
    return {int(r.friend_id) for r in rows}


def _is_blocked(db: Session, actor_user_id: int, target_user_id: int) -> bool:
    return db.query(FriendBlock).filter(
        FriendBlock.user_id == actor_user_id,
        FriendBlock.blocked_user_id == target_user_id,
    ).first() is not None


def _visible_to_user(db: Session, activity: SquareActivity, current_user_id: int) -> bool:
    if activity.user_id == current_user_id:
        return True
    if _is_blocked(db, activity.user_id, current_user_id):
        return False
    meta = dict(activity.metadata_json or {})
    visibility = str(meta.get("visibility", "public"))
    if visibility == "public":
        return True
    if visibility == "friends":
        return activity.user_id in _friend_ids(db, current_user_id)
    return False


def _serialize_activity(db: Session, activity: SquareActivity, current_user_id: int) -> Dict[str, Any]:
    user = db.query(UserExt).filter(UserExt.customer_id == activity.user_id).first()
    username = (user.nickname if user and user.nickname else None) or (user.referral_code if user else None) or f"User_{activity.user_id}"
    avatar = (user.avatar_url if user and user.avatar_url else None) or f"https://api.dicebear.com/7.x/avataaars/svg?seed={activity.user_id}"
    comments_count = db.query(Comment).filter(
        Comment.target_type == "activity",
        Comment.target_id == activity.id,
    ).count()
    comments_count += db.query(ActivityCommentReply).filter(
        ActivityCommentReply.activity_id == activity.id,
    ).count()
    liked = db.query(SquareActivityLike).filter(
        SquareActivityLike.activity_id == activity.id,
        SquareActivityLike.user_id == current_user_id,
    ).first() is not None
    meta = dict(activity.metadata_json or {})
    return {
        "id": str(activity.id),
        "user_id": int(activity.user_id or 0),
        "user": username,
        "avatar": avatar,
        "content": activity.content or "",
        "media": meta.get("media", []),
        "visibility": meta.get("visibility", "public"),
        "likes": int(activity.likes or 0),
        "comments": int(comments_count),
        "liked": liked,
        "timestamp": activity.created_at.isoformat() if activity.created_at else "",
        "type": activity.type or "moment",
        "can_delete": int(activity.user_id or 0) == int(current_user_id),
        "is_official": bool(meta.get("is_official")),
        "official_type": str(meta.get("official_type") or ""),
        "pinned": bool(meta.get("pinned")),
    }


def _normalize_official_type(value: str) -> Optional[str]:
    val = str(value or "").strip().lower()
    if val in {"activity", "topic"}:
        return val
    return None


def _can_manage_official_activity(user_type: str) -> bool:
    return str(user_type or "").strip().lower() == "admin"


def _activity_sort_key(activity: SquareActivity) -> Any:
    meta = dict(activity.metadata_json or {})
    pinned_rank = 0 if bool(meta.get("pinned")) else 1
    created_at = activity.created_at or datetime.min
    return (pinned_rank, -created_at.timestamp())


def _serialize_social_comment(
    comment: Comment,
    user: Optional[UserExt],
    activity_owner_id: int,
    current_user_id: int,
    replies: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    return {
        "id": str(comment.id),
        "user_id": int(comment.user_id or 0),
        "user": (user.nickname if user and user.nickname else None) or (user.referral_code if user else None) or f"User_{comment.user_id}",
        "content": comment.content or "",
        "timestamp": comment.created_at.isoformat() if comment.created_at else "",
        "can_delete": int(comment.user_id or 0) == int(current_user_id) or int(activity_owner_id or 0) == int(current_user_id),
        "is_author": int(comment.user_id or 0) == int(activity_owner_id or 0),
        "parent_comment_id": "",
        "replies": replies or [],
    }


def _serialize_social_reply(
    reply: ActivityCommentReply,
    user: Optional[UserExt],
    activity_owner_id: int,
    current_user_id: int,
) -> Dict[str, Any]:
    return {
        "id": str(reply.id),
        "user_id": int(reply.user_id or 0),
        "user": (user.nickname if user and user.nickname else None) or (user.referral_code if user else None) or f"User_{reply.user_id}",
        "content": reply.content or "",
        "timestamp": reply.created_at.isoformat() if reply.created_at else "",
        "can_delete": int(reply.user_id or 0) == int(current_user_id) or int(activity_owner_id or 0) == int(current_user_id),
        "is_author": int(reply.user_id or 0) == int(activity_owner_id or 0),
        "parent_comment_id": str(reply.comment_id),
        "replies": [],
    }


def _shopify_graphql_endpoint() -> str:
    shop_name = str(settings.SHOPIFY_SHOP_NAME or "").strip()
    if not shop_name:
        raise HTTPException(status_code=503, detail="shopify_not_configured")
    if shop_name.endswith(".myshopify.com"):
        domain = shop_name
    else:
        domain = f"{shop_name}.myshopify.com"
    return f"https://{domain}/admin/api/2024-01/graphql.json"


def _shopify_rest_base() -> str:
    shop_name = str(settings.SHOPIFY_SHOP_NAME or "").strip()
    if not shop_name:
        raise HTTPException(status_code=503, detail="shopify_not_configured")
    if shop_name.endswith(".myshopify.com"):
        domain = shop_name
    else:
        domain = f"{shop_name}.myshopify.com"
    # Resolve canonical admin domain (some aliases can work for GraphQL but fail on REST with 403)
    try:
        payload = _shopify_execute("query { shop { myshopifyDomain } }", {})
        canon = (((payload or {}).get("data") or {}).get("shop") or {}).get("myshopifyDomain")
        if canon:
            domain = str(canon)
    except Exception:
        pass
    return f"https://{domain}/admin/api/2024-01"


def _create_shopify_staged_upload(file_name: str, mime_type: str, file_size: int) -> Dict[str, Any]:
    if not settings.SHOPIFY_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="shopify_not_configured")
    endpoint = _shopify_graphql_endpoint()
    query = """
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters {
        name
        value
      }
    }
    userErrors {
      field
      message
    }
  }
}
"""
    variables = {
        "input": [
            {
                "resource": "FILE",
                "filename": file_name,
                "mimeType": mime_type,
                "httpMethod": "POST",
                "fileSize": str(file_size),
            }
        ]
    }
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": settings.SHOPIFY_ACCESS_TOKEN,
    }
    try:
        resp = httpx.post(endpoint, json={"query": query, "variables": variables}, headers=headers, timeout=20.0)
        resp.raise_for_status()
        payload = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="shopify_staged_upload_failed")
    user_errors = (((payload or {}).get("data") or {}).get("stagedUploadsCreate") or {}).get("userErrors") or []
    if user_errors:
        raise HTTPException(status_code=400, detail=f"shopify_user_error:{user_errors[0].get('message','unknown')}")
    targets = (((payload or {}).get("data") or {}).get("stagedUploadsCreate") or {}).get("stagedTargets") or []
    if not targets:
        raise HTTPException(status_code=502, detail="shopify_staged_upload_empty")
    t = targets[0]
    return {
        "upload_url": t.get("url"),
        "resource_url": t.get("resourceUrl"),
        "parameters": t.get("parameters") or [],
    }


def _shopify_execute(query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    if not settings.SHOPIFY_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="shopify_not_configured")
    endpoint = _shopify_graphql_endpoint()
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": settings.SHOPIFY_ACCESS_TOKEN,
    }
    try:
        resp = httpx.post(endpoint, json={"query": query, "variables": variables}, headers=headers, timeout=25.0)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="shopify_graphql_failed")


def _shopify_rest_request(method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if not settings.SHOPIFY_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="shopify_not_configured")
    base = _shopify_rest_base()
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": settings.SHOPIFY_ACCESS_TOKEN,
    }
    try:
        resp = httpx.request(method, f"{base}{path}", headers=headers, json=payload, timeout=25.0)
        resp.raise_for_status()
        return resp.json() if resp.text else {}
    except Exception:
        raise HTTPException(status_code=502, detail=f"shopify_rest_failed:{path}")


def _ensure_social_blog_id() -> int:
    title = "Social Feed"
    handle = "social-feed"
    data = _shopify_rest_request("GET", "/blogs.json?limit=250")
    blogs = data.get("blogs") or []
    for b in blogs:
        if str(b.get("handle") or "") == handle or str(b.get("title") or "") == title:
            return int(b["id"])
    created = _shopify_rest_request("POST", "/blogs.json", {"blog": {"title": title}})
    blog = created.get("blog") or {}
    if not blog.get("id"):
        raise HTTPException(status_code=502, detail="shopify_blog_create_failed")
    return int(blog["id"])


def _build_article_body_html(content: str, media: List[Dict[str, Any]]) -> str:
    parts = []
    if content.strip():
        parts.append(f"<p>{html_lib.escape(content.strip())}</p>")
    for m in media or []:
        url = str(m.get("cdn_url") or m.get("url") or "").strip()
        if not url:
            continue
        parts.append(f'<p><img src="{html_lib.escape(url)}" alt="social-media" /></p>')
    return "\n".join(parts) if parts else "<p>Social post</p>"


def _create_shopify_article_for_activity(activity: SquareActivity, content: str, media: List[Dict[str, Any]], visibility: str) -> Dict[str, Any]:
    blog_id = _ensure_social_blog_id()
    title = (content.strip()[:60] if content.strip() else f"Social Post {str(activity.id)[:8]}")
    body_html = _build_article_body_html(content, media)
    meta = dict(activity.metadata_json or {})
    tags = "social-feed,moment" + (",friends-only" if visibility == "friends" else ",public")
    if bool(meta.get("is_official")):
        tags += ",official"
    official_type = _normalize_official_type(str(meta.get("official_type") or ""))
    if official_type:
        tags += f",official-{official_type}"
    payload = {
        "article": {
            "title": title,
            "author": f"user_{activity.user_id}",
            "tags": tags,
            "body_html": body_html,
            "published": True,
        }
    }
    data = _shopify_rest_request("POST", f"/blogs/{blog_id}/articles.json", payload)
    article = data.get("article") or {}
    if not article.get("id"):
        raise HTTPException(status_code=502, detail="shopify_article_create_failed")
    return {
        "blog_id": int(blog_id),
        "article_id": int(article["id"]),
        "article_url": str(article.get("admin_graphql_api_id") or ""),
    }


def _delete_shopify_article(blog_id: int, article_id: int) -> None:
    _shopify_rest_request("DELETE", f"/blogs/{int(blog_id)}/articles/{int(article_id)}.json")


def _shopify_publish_staged_resource(staged_url: str, mime_type: str) -> str:
    content_type = "IMAGE" if str(mime_type or "").startswith("image/") else "FILE"
    mutation = """
mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files {
      __typename
      ... on MediaImage { id image { url } }
      ... on GenericFile { id url }
    }
    userErrors { field message }
  }
}
"""
    payload = _shopify_execute(
        mutation,
        {
            "files": [
                {
                    "originalSource": staged_url,
                    "contentType": content_type,
                }
            ]
        },
    )
    result = ((payload or {}).get("data") or {}).get("fileCreate") or {}
    errors = result.get("userErrors") or []
    if errors:
        raise HTTPException(status_code=400, detail=f"shopify_file_create_error:{errors[0].get('message','unknown')}")
    files = result.get("files") or []
    if not files:
        raise HTTPException(status_code=502, detail="shopify_file_create_empty")

    f = files[0]
    file_id = str(f.get("id") or "")
    if f.get("__typename") == "MediaImage":
        image = f.get("image") or {}
        url = image.get("url")
    else:
        url = f.get("url")
    if not url and file_id:
        query = """
query nodeFile($id: ID!) {
  node(id: $id) {
    __typename
    ... on MediaImage { image { url } }
    ... on GenericFile { url }
  }
}
"""
        for _ in range(6):
            time.sleep(1.0)
            qres = _shopify_execute(query, {"id": file_id})
            node = ((qres or {}).get("data") or {}).get("node") or {}
            if node.get("__typename") == "MediaImage":
                img = node.get("image") or {}
                url = img.get("url")
            else:
                url = node.get("url")
            if url:
                break
    if not url:
        raise HTTPException(status_code=502, detail="shopify_file_url_missing")
    return str(url)


@router.post("/media/upload-ticket")
def create_media_upload_ticket(
    payload: MediaUploadTicketPayload,
    _current_user: UserExt = Depends(get_current_user),
) -> Any:
    if not payload.file_name or not payload.mime_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="invalid_media_type")
    if payload.file_size <= 0 or payload.file_size > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="invalid_media_size")
    staged = _create_shopify_staged_upload(payload.file_name, payload.mime_type, payload.file_size)
    return {
        "status": "success",
        "ticket": {
            "provider": "shopify",
            "token": str(uuid.uuid4()),
            "max_size": 20 * 1024 * 1024,
            "upload_url": staged["upload_url"],
            "resource_url": staged["resource_url"],
            "parameters": staged["parameters"],
            "note": "upload_to_upload_url_with_parameters_then_commit",
        },
    }


@router.post("/media/commit")
def commit_media(
    payload: MediaCommitPayload,
    _current_user: UserExt = Depends(get_current_user),
) -> Any:
    url = str(payload.cdn_url or "").strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="invalid_cdn_url")
    final_url = url
    if "shopify-staged-uploads.storage.googleapis.com" in url:
        final_url = _shopify_publish_staged_resource(url, payload.mime_type or "image/jpeg")
    elif "shopify" not in url and "cdn" not in url:
        raise HTTPException(status_code=400, detail="cdn_must_be_shopify")
    return {
        "status": "success",
        "item": {
            "cdn_url": final_url,
            "mime_type": payload.mime_type or "image/jpeg",
            "width": payload.width or 0,
            "height": payload.height or 0,
            "size": payload.size or 0,
            "provider": "shopify",
            "committed": True,
        },
    }


@router.post("/activities")
def create_activity(
    payload: ActivityCreatePayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    content = str(payload.content or "").strip()
    media = payload.media or []
    if not content and not media:
        raise HTTPException(status_code=400, detail="empty_activity")
    visibility = "friends" if str(payload.visibility) == "friends" else "public"
    for item in media:
        if not bool(item.get("committed")):
            raise HTTPException(status_code=400, detail="media_not_committed")
    activity = SquareActivity(
        user_id=current_user.customer_id,
        type="moment",
        content=content,
        metadata_json={"visibility": visibility, "media": media},
        likes=0,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    meta = dict(activity.metadata_json or {})
    try:
        article = _create_shopify_article_for_activity(activity, content, media, visibility)
        meta["shopify_blog_id"] = article["blog_id"]
        meta["shopify_article_id"] = article["article_id"]
        meta["shopify_article_gid"] = article["article_url"]
    except Exception as e:
        # Do not fail activity creation if blog sync fails; keep trace for ops.
        meta["shopify_sync_error"] = str(getattr(e, "detail", "unknown"))
    activity.metadata_json = meta
    db.commit()
    return {"status": "success", "item": _serialize_activity(db, activity, current_user.customer_id)}


@router.post("/official/activities")
def create_official_activity(
    payload: OfficialActivityCreatePayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    if not _can_manage_official_activity(getattr(current_user, "user_type", "")):
        raise HTTPException(status_code=403, detail="forbidden")
    official_type = _normalize_official_type(payload.official_type)
    if not official_type:
        raise HTTPException(status_code=400, detail="invalid_official_type")
    content = str(payload.content or "").strip()
    media = payload.media or []
    if not content and not media:
        raise HTTPException(status_code=400, detail="empty_activity")
    visibility = "friends" if str(payload.visibility) == "friends" else "public"
    for item in media:
        if not bool(item.get("committed")):
            raise HTTPException(status_code=400, detail="media_not_committed")
    activity = SquareActivity(
        user_id=current_user.customer_id,
        type="official",
        content=content,
        metadata_json={
            "visibility": visibility,
            "media": media,
            "is_official": True,
            "official_type": official_type,
            "pinned": bool(payload.pinned),
        },
        likes=0,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    meta = dict(activity.metadata_json or {})
    try:
        article = _create_shopify_article_for_activity(activity, content, media, visibility)
        meta["shopify_blog_id"] = article["blog_id"]
        meta["shopify_article_id"] = article["article_id"]
        meta["shopify_article_gid"] = article["article_url"]
    except Exception as e:
        meta["shopify_sync_error"] = str(getattr(e, "detail", "unknown"))
    activity.metadata_json = meta
    db.commit()
    return {"status": "success", "item": _serialize_activity(db, activity, current_user.customer_id)}


@router.put("/activities/{activity_id}/pin")
def pin_activity(
    activity_id: str,
    payload: PinActivityPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    if not _can_manage_official_activity(getattr(current_user, "user_type", "")):
        raise HTTPException(status_code=403, detail="forbidden")
    try:
        aid = uuid.UUID(str(activity_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_activity_id")
    row = db.query(SquareActivity).filter(SquareActivity.id == aid).first()
    if not row:
        raise HTTPException(status_code=404, detail="activity_not_found")
    meta = dict(row.metadata_json or {})
    if not bool(meta.get("is_official")):
        raise HTTPException(status_code=400, detail="only_official_can_be_pinned")
    meta["pinned"] = bool(payload.pinned)
    row.metadata_json = meta
    db.commit()
    db.refresh(row)
    return {"status": "success", "item": _serialize_activity(db, row, current_user.customer_id)}


@router.get("/activities")
def list_activities(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    query_limit = max(100, min(500, max(1, limit) + max(0, offset) + 100))
    rows = db.query(SquareActivity).filter(
        SquareActivity.content.isnot(None),
    ).order_by(SquareActivity.created_at.desc()).limit(query_limit).all()
    visible_rows: List[SquareActivity] = []
    for row in rows:
        if _visible_to_user(db, row, current_user.customer_id):
            visible_rows.append(row)
    visible_rows.sort(key=_activity_sort_key)
    sliced = visible_rows[max(0, offset): max(0, offset) + max(1, min(limit, 100))]
    items = [_serialize_activity(db, row, current_user.customer_id) for row in sliced]
    return {"status": "success", "items": items}


@router.delete("/activities/{activity_id}")
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    try:
        aid = uuid.UUID(str(activity_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_activity_id")
    row = db.query(SquareActivity).filter(SquareActivity.id == aid).first()
    if not row:
        raise HTTPException(status_code=404, detail="activity_not_found")
    if int(row.user_id or 0) != int(current_user.customer_id):
        raise HTTPException(status_code=403, detail="forbidden")
    meta = dict(row.metadata_json or {})
    blog_id = meta.get("shopify_blog_id")
    article_id = meta.get("shopify_article_id")
    if blog_id and article_id:
        try:
            _delete_shopify_article(int(blog_id), int(article_id))
        except Exception:
            pass
    db.query(SquareActivityLike).filter(SquareActivityLike.activity_id == aid).delete()
    db.query(ActivityCommentReply).filter(ActivityCommentReply.activity_id == aid).delete()
    db.query(Comment).filter(Comment.target_type == "activity", Comment.target_id == aid).delete()
    db.delete(row)
    db.commit()
    return {"status": "success"}


@router.post("/activities/{activity_id}/like")
def like_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    try:
        aid = uuid.UUID(str(activity_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_activity_id")
    row = db.query(SquareActivity).filter(SquareActivity.id == aid).first()
    if not row:
        raise HTTPException(status_code=404, detail="activity_not_found")
    if not _visible_to_user(db, row, current_user.customer_id):
        raise HTTPException(status_code=403, detail="forbidden")
    db.add(SquareActivityLike(activity_id=aid, user_id=current_user.customer_id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    row = db.query(SquareActivity).filter(SquareActivity.id == aid).first()
    row.likes = db.query(SquareActivityLike).filter(SquareActivityLike.activity_id == aid).count()
    db.commit()
    return {"status": "success", "likes": int(row.likes or 0)}


@router.delete("/activities/{activity_id}/like")
def unlike_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    try:
        aid = uuid.UUID(str(activity_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_activity_id")
    row = db.query(SquareActivity).filter(SquareActivity.id == aid).first()
    if not row:
        raise HTTPException(status_code=404, detail="activity_not_found")
    db.query(SquareActivityLike).filter(
        SquareActivityLike.activity_id == aid,
        SquareActivityLike.user_id == current_user.customer_id,
    ).delete()
    row.likes = db.query(SquareActivityLike).filter(SquareActivityLike.activity_id == aid).count()
    db.commit()
    return {"status": "success", "likes": int(row.likes or 0)}


@router.get("/activities/{activity_id}/comments")
def list_comments(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    try:
        aid = uuid.UUID(str(activity_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_activity_id")
    row = db.query(SquareActivity).filter(SquareActivity.id == aid).first()
    if not row:
        raise HTTPException(status_code=404, detail="activity_not_found")
    if not _visible_to_user(db, row, current_user.customer_id):
        raise HTTPException(status_code=403, detail="forbidden")
    comments = db.query(Comment).filter(
        Comment.target_type == "activity",
        Comment.target_id == aid,
    ).order_by(Comment.created_at.asc()).all()
    replies = db.query(ActivityCommentReply).filter(
        ActivityCommentReply.activity_id == aid,
    ).order_by(ActivityCommentReply.created_at.asc()).all()
    user_ids = {int(c.user_id or 0) for c in comments}
    user_ids.update({int(r.user_id or 0) for r in replies})
    users = {
        u.customer_id: u
        for u in db.query(UserExt).filter(UserExt.customer_id.in_(list(user_ids))).all()
    } if user_ids else {}
    replies_by_comment: Dict[str, List[Dict[str, Any]]] = {}
    for r in replies:
        key = str(r.comment_id)
        replies_by_comment.setdefault(key, []).append(
            _serialize_social_reply(
                reply=r,
                user=users.get(r.user_id),
                activity_owner_id=int(row.user_id or 0),
                current_user_id=current_user.customer_id,
            )
        )
    items = []
    for c in comments:
        items.append(
            _serialize_social_comment(
                comment=c,
                user=users.get(c.user_id),
                activity_owner_id=int(row.user_id or 0),
                current_user_id=current_user.customer_id,
                replies=replies_by_comment.get(str(c.id), []),
            )
        )
    return {"status": "success", "items": items}


@router.post("/activities/{activity_id}/comments")
def create_comment(
    activity_id: str,
    payload: CommentPayload,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    try:
        aid = uuid.UUID(str(activity_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_activity_id")
    row = db.query(SquareActivity).filter(SquareActivity.id == aid).first()
    if not row:
        raise HTTPException(status_code=404, detail="activity_not_found")
    if not _visible_to_user(db, row, current_user.customer_id):
        raise HTTPException(status_code=403, detail="forbidden")
    content = str(payload.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="empty_comment")
    parent_comment_id = str(payload.parent_comment_id or "").strip()
    if parent_comment_id:
        try:
            parent_uuid = uuid.UUID(parent_comment_id)
        except Exception:
            raise HTTPException(status_code=400, detail="invalid_parent_comment_id")
        parent = db.query(Comment).filter(
            Comment.id == parent_uuid,
            Comment.target_type == "activity",
            Comment.target_id == aid,
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="parent_comment_not_found")
        r = ActivityCommentReply(
            activity_id=aid,
            comment_id=parent_uuid,
            user_id=current_user.customer_id,
            content=content,
        )
        db.add(r)
        db.commit()
        db.refresh(r)
        return {
            "status": "success",
            "item": {
                "id": str(r.id),
                "content": r.content,
                "parent_comment_id": str(parent_uuid),
            },
        }

    c = Comment(target_id=aid, target_type="activity", user_id=current_user.customer_id, content=content)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"status": "success", "item": {"id": str(c.id), "content": c.content, "parent_comment_id": ""}}


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
) -> Any:
    try:
        cid = uuid.UUID(str(comment_id))
    except Exception:
        raise HTTPException(status_code=400, detail="invalid_comment_id")
    c = db.query(Comment).filter(Comment.id == cid, Comment.target_type == "activity").first()
    if c:
        activity = db.query(SquareActivity).filter(SquareActivity.id == c.target_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="activity_not_found")
        if int(c.user_id or 0) != int(current_user.customer_id) and int(activity.user_id or 0) != int(current_user.customer_id):
            raise HTTPException(status_code=403, detail="forbidden")
        db.query(ActivityCommentReply).filter(ActivityCommentReply.comment_id == c.id).delete()
        db.delete(c)
        db.commit()
        return {"status": "success"}

    r = db.query(ActivityCommentReply).filter(ActivityCommentReply.id == cid).first()
    if not r:
        raise HTTPException(status_code=404, detail="comment_not_found")
    activity = db.query(SquareActivity).filter(SquareActivity.id == r.activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="activity_not_found")
    if int(r.user_id or 0) != int(current_user.customer_id) and int(activity.user_id or 0) != int(current_user.customer_id):
        raise HTTPException(status_code=403, detail="forbidden")
    db.delete(r)
    db.commit()
    return {"status": "success"}
