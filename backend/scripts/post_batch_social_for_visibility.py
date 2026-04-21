#!/usr/bin/env python3
from datetime import datetime

from app.db.session import SessionLocal
from app.models.ledger import SquareActivity, UserExt


def main() -> None:
    batch = datetime.utcnow().strftime("%H%M%S")
    content = f"联调测试动态批次 {batch}"
    created = 0
    with SessionLocal() as db:
        users = (
            db.query(UserExt)
            .filter(UserExt.is_active == True)  # noqa: E712
            .order_by(UserExt.customer_id.asc())
            .limit(20)
            .all()
        )
        for u in users:
            row = SquareActivity(
                user_id=u.customer_id,
                type="moment",
                content=content,
                metadata_json={
                    "visibility": "public",
                    "media": [
                        {
                            "cdn_url": f"https://picsum.photos/seed/social-batch-{batch}-{u.customer_id}/800/500",
                            "mime_type": "image/jpeg",
                            "width": 800,
                            "height": 500,
                            "size": 0,
                            "provider": "mock",
                            "committed": True,
                        }
                    ],
                },
                likes=0,
            )
            db.add(row)
            created += 1
        db.commit()
    print("BATCH=", batch)
    print("CREATED=", created)


if __name__ == "__main__":
    main()
