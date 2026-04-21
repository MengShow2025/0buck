#!/usr/bin/env python3
"""
Group Management API smoke check (owner/admin/member roles)

Usage:
  API_BASE_URL="http://localhost:8000/api/v1" \
  TOKEN_OWNER="..." TOKEN_ADMIN="..." TOKEN_MEMBER="..." \
  GROUP_ID="123" \
  python3 backend/scripts/smoke_groups_api.py

Optional:
  RUN_MUTATIONS=1  # run pin/unpin mutation checks
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Optional, Tuple


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
TOKEN_OWNER = os.getenv("TOKEN_OWNER", "")
TOKEN_ADMIN = os.getenv("TOKEN_ADMIN", "")
TOKEN_MEMBER = os.getenv("TOKEN_MEMBER", "")
GROUP_ID = os.getenv("GROUP_ID", "")
RUN_MUTATIONS = os.getenv("RUN_MUTATIONS", "0") == "1"


def _req(
    method: str,
    path: str,
    token: str,
    payload: Optional[Dict[str, Any]] = None,
) -> Tuple[int, Dict[str, Any]]:
    url = f"{API_BASE_URL}{path}"
    data = None
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
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
    print("=== Group API Smoke Start ===")
    print("API_BASE_URL:", API_BASE_URL)

    _expect("TOKEN_OWNER provided", bool(TOKEN_OWNER), "(set TOKEN_OWNER)")
    _expect("TOKEN_ADMIN provided", bool(TOKEN_ADMIN), "(set TOKEN_ADMIN)")
    _expect("TOKEN_MEMBER provided", bool(TOKEN_MEMBER), "(set TOKEN_MEMBER)")
    _expect("GROUP_ID provided", bool(GROUP_ID), "(set GROUP_ID)")

    # 1) list groups (all roles should access)
    s1, _ = _req("GET", "/groups", TOKEN_OWNER)
    s2, _ = _req("GET", "/groups", TOKEN_ADMIN)
    s3, _ = _req("GET", "/groups", TOKEN_MEMBER)
    _expect("owner list groups", s1 == 200, f"status={s1}")
    _expect("admin list groups", s2 == 200, f"status={s2}")
    _expect("member list groups", s3 == 200, f"status={s3}")

    gid = int(GROUP_ID)

    # 2) group detail + members
    for role_name, token in (("owner", TOKEN_OWNER), ("admin", TOKEN_ADMIN), ("member", TOKEN_MEMBER)):
        s, body = _req("GET", f"/groups/{gid}", token)
        _expect(f"{role_name} group detail", s == 200, f"status={s} body={body}")
        s, body = _req("GET", f"/groups/{gid}/members", token)
        _expect(f"{role_name} group members", s == 200, f"status={s} body={body}")

    # 3) audit logs permission: owner/admin=200, member=403
    s_owner, _ = _req("GET", f"/groups/{gid}/audit-logs", TOKEN_OWNER)
    s_admin, _ = _req("GET", f"/groups/{gid}/audit-logs", TOKEN_ADMIN)
    s_member, _ = _req("GET", f"/groups/{gid}/audit-logs", TOKEN_MEMBER)
    _expect("owner audit logs", s_owner == 200, f"status={s_owner}")
    _expect("admin audit logs", s_admin == 200, f"status={s_admin}")
    _expect("member audit denied", s_member == 403, f"status={s_member}")

    if RUN_MUTATIONS:
        # 4) pin/unpin permission: owner/admin allowed; member denied
        pin_payload = {
            "message_id": f"smoke-{int(time.time())}",
            "title": "Smoke Pin",
            "content": "smoke test pinned content",
            "sender": "smoke",
            "time": "now",
        }
        s, body = _req("POST", f"/groups/{gid}/pin-message", TOKEN_OWNER, pin_payload)
        _expect("owner pin message", s == 200, f"status={s} body={body}")
        message_id = pin_payload["message_id"]

        s, body = _req("POST", f"/groups/{gid}/pin-message", TOKEN_MEMBER, pin_payload)
        _expect("member pin denied", s == 403, f"status={s} body={body}")

        s, body = _req("DELETE", f"/groups/{gid}/pin-message/{message_id}", TOKEN_ADMIN)
        _expect("admin unpin message", s == 200, f"status={s} body={body}")

    print("=== Group API Smoke OK ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
