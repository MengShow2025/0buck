#!/usr/bin/env python3
import uuid
import requests

from app.api.social import _create_shopify_staged_upload, _shopify_publish_staged_resource, _create_shopify_article_for_activity
from app.db.session import SessionLocal
from app.models.ledger import SquareActivity, UserExt


def main() -> None:
    # Use a visible-size image for human validation, not a 1x1 test pixel.
    image_bytes = requests.get("https://picsum.photos/seed/social-visible/800/500", timeout=30).content

    staged = _create_shopify_staged_upload("social-visible.jpg", "image/jpeg", len(image_bytes))
    form = {str(p.get("name")): str(p.get("value")) for p in staged.get("parameters", [])}
    files = {"file": ("social-visible.jpg", image_bytes, "image/jpeg")}

    resp = requests.post(staged["upload_url"], data=form, files=files, timeout=30)
    resp.raise_for_status()

    staged_url = staged.get("resource_url")
    if not staged_url:
        raise RuntimeError("No resource_url from Shopify staged upload")
    resource_url = _shopify_publish_staged_resource(staged_url, "image/jpeg")

    with SessionLocal() as db:
        user = db.query(UserExt).filter(UserExt.is_active == True).order_by(UserExt.customer_id.asc()).first()
        if not user:
            raise RuntimeError("No active user found")

        activity = SquareActivity(
            user_id=user.customer_id,
            type="moment",
            content=f"Shopify上传测试动态 {uuid.uuid4().hex[:8]}",
            metadata_json={
                "visibility": "public",
                "media": [
                    {
                        "cdn_url": resource_url,
                        "mime_type": "image/jpeg",
                        "width": 800,
                        "height": 500,
                        "size": len(image_bytes),
                        "provider": "shopify",
                        "committed": True,
                    }
                ],
            },
            likes=0,
        )
        db.add(activity)
        db.commit()
        db.refresh(activity)

        article = None
        try:
            article = _create_shopify_article_for_activity(
                activity=activity,
                content=activity.content or "",
                media=activity.metadata_json.get("media", []),
                visibility=activity.metadata_json.get("visibility", "public"),
            )
            meta = dict(activity.metadata_json or {})
            meta["shopify_blog_id"] = article["blog_id"]
            meta["shopify_article_id"] = article["article_id"]
            meta["shopify_article_gid"] = article["article_url"]
            activity.metadata_json = meta
            db.commit()
        except Exception as e:
            print("ARTICLE_SYNC_WARNING=", getattr(e, "detail", str(e)))

        print("CREATED_ACTIVITY_ID=", activity.id)
        print("USER_ID=", user.customer_id)
        print("STAGED_RESOURCE_URL=", staged_url)
        print("PUBLIC_CDN_URL=", resource_url)
        if article:
            print("BLOG_ID=", article["blog_id"])
            print("ARTICLE_ID=", article["article_id"])


if __name__ == "__main__":
    main()
