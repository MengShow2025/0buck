#!/usr/bin/env python3
"""
Friends API smoke checks for release validation.

Usage:
  API_BASE_URL="http://localhost:8000/api/v1" \
  TOKEN_A="..." TOKEN_B="..." TOKEN_C="..." \
  USER_B_ID="1002" USER_C_ID="1003" \
  python3 backend/scripts/smoke_friends_api.py
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
USER_B_ID = os.getenv("USER_B_ID", "")
USER_C_ID = os.getenv("USER_C_ID", "")
USER_A_ID = os.getenv("USER_A_ID", "")


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
    _expect("USER_B_ID provided", bool(USER_B_ID), "set USER_B_ID")
    _expect("USER_C_ID provided", bool(USER_C_ID), "set USER_C_ID")

    b_id = int(USER_B_ID)
    c_id = int(USER_C_ID)

    # 1) A -> B request
    s, body = _req("POST", "/friends/requests", TOKEN_A, {"target_user_id": b_id})
    _expect("A request B", s == 200, f"status={s} body={body}")

    # 2) B -> A request should auto-accept or idempotent-success (optional if USER_A_ID supplied)
    if int(USER_A_ID or 0) > 0:
        s, body = _req("POST", "/friends/requests", TOKEN_B, {"target_user_id": int(USER_A_ID)})
        _expect("B reverse request handled", s == 200, f"status={s} body={body}")

    # 3) B accept A's request (idempotent-safe)
    s_list, list_body = _req("GET", "/friends/requests", TOKEN_B)
    _expect("B list requests", s_list == 200, f"status={s_list} body={list_body}")
    req_id = None
    for item in list_body.get("items", []):
        if int(item.get("id", 0)) > 0 and str(item.get("status")) == "pending":
            req_id = int(item["id"])
            break
    if req_id:
        s, body = _req("POST", f"/friends/requests/{req_id}/accept", TOKEN_B)
        _expect("B accept request", s == 200, f"status={s} body={body}")

    # 4) A block C
    s, body = _req("POST", f"/friends/block/{c_id}", TOKEN_A)
    _expect("A block C", s == 200, f"status={s} body={body}")

    # 5) C cannot request A after blocked
    a_id = int(USER_A_ID or 0)
    if a_id > 0:
        s, body = _req("POST", "/friends/requests", TOKEN_C, {"target_user_id": a_id})
        _expect("C request A denied", s == 403, f"status={s} body={body}")

    # 6) blocked list visible
    s, body = _req("GET", "/friends/blocked", TOKEN_A)
    _expect("A list blocked", s == 200, f"status={s} body={body}")

    print("=== Friends API Smoke OK ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
