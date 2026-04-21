#!/usr/bin/env python3
"""
Social feed MVP smoke checks.

Usage:
  API_BASE_URL="http://localhost:8000/api/v1" \
  TOKEN_A="..." TOKEN_B="..." TOKEN_C="..." \
  python3 backend/scripts/smoke_social_api.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any, Dict, Optional, Tuple

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
TOKEN_A = os.getenv("TOKEN_A", "")
TOKEN_B = os.getenv("TOKEN_B", "")
TOKEN_C = os.getenv("TOKEN_C", "")


def _req(method: str, path: str, token: str, payload: Optional[Dict[str, Any]] = None) -> Tuple[int, Dict[str, Any]]:
    url = f"{API_BASE_URL}{path}"
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, method=method, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8") or "{}"
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = (e.read() or b"{}").decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed


def _expect(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        print(f"[PASS] {name}")
    else:
        print(f"[FAIL] {name} {detail}")
        raise SystemExit(1)


def main() -> int:
    _expect("TOKEN_A provided", bool(TOKEN_A), "set TOKEN_A")
    _expect("TOKEN_B provided", bool(TOKEN_B), "set TOKEN_B")
    _expect("TOKEN_C provided", bool(TOKEN_C), "set TOKEN_C")

    # 1) media commit
    s, body = _req("POST", "/social/media/commit", TOKEN_A, {"cdn_url": "https://picsum.photos/seed/social/600/600", "mime_type": "image/jpeg"})
    _expect("commit media", s == 200, f"status={s} body={body}")
    media_item = body.get("item") or {}

    # 2) create public activity
    s, body = _req(
        "POST",
        "/social/activities",
        TOKEN_A,
        {"content": "smoke-public", "visibility": "public", "media": [media_item]},
    )
    _expect("create public activity", s == 200, f"status={s} body={body}")
    aid = str((body.get("item") or {}).get("id") or "")
    _expect("activity id exists", bool(aid))

    # 3) like/unlike idempotency path
    s1, b1 = _req("POST", f"/social/activities/{aid}/like", TOKEN_B)
    _expect("B like", s1 == 200, f"status={s1} body={b1}")
    s2, b2 = _req("POST", f"/social/activities/{aid}/like", TOKEN_B)
    _expect("B like again idempotent", s2 == 200, f"status={s2} body={b2}")
    s3, b3 = _req("DELETE", f"/social/activities/{aid}/like", TOKEN_B)
    _expect("B unlike", s3 == 200, f"status={s3} body={b3}")

    # 4) comments add/list/delete
    s, body = _req("POST", f"/social/activities/{aid}/comments", TOKEN_B, {"content": "smoke-comment"})
    _expect("create comment", s == 200, f"status={s} body={body}")
    cid = str((body.get("item") or {}).get("id") or "")
    _expect("comment id exists", bool(cid))
    s, body = _req("GET", f"/social/activities/{aid}/comments", TOKEN_A)
    _expect("list comments", s == 200, f"status={s} body={body}")
    s, body = _req("DELETE", f"/social/comments/{cid}", TOKEN_B)
    _expect("delete own comment", s == 200, f"status={s} body={body}")

    # 5) delete activity by owner
    s, body = _req("DELETE", f"/social/activities/{aid}", TOKEN_A)
    _expect("delete activity by owner", s == 200, f"status={s} body={body}")

    print("=== Social API Smoke OK ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
