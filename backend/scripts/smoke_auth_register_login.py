#!/usr/bin/env python3
import uuid

import requests


def main() -> None:
    base = "http://127.0.0.1:8000/api/v1"
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"

    reg = requests.post(
        f"{base}/auth/register",
        json={"email": email, "password": "abc12345", "confirm_password": "abc12345"},
        timeout=20,
    )
    print("register_status_code=", reg.status_code)
    print("register_status=", reg.json().get("status"))

    reg_dup = requests.post(
        f"{base}/auth/register",
        json={"email": email, "password": "abc12345", "confirm_password": "abc12345"},
        timeout=20,
    )
    print("register_duplicate_status_code=", reg_dup.status_code)
    print("register_duplicate_body=", reg_dup.text[:120])

    bad = requests.post(f"{base}/auth/login", json={"email": email, "password": "wrong"}, timeout=20)
    print("login_bad_status_code=", bad.status_code)
    print("login_bad_body=", bad.text[:120])

    good = requests.post(f"{base}/auth/login", json={"email": email, "password": "abc12345"}, timeout=20)
    print("login_ok_status_code=", good.status_code)
    token = (good.json() or {}).get("access_token")
    print("has_token=", bool(token))
    if not token:
        return

    me = requests.get(f"{base}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=20)
    print("me_status_code=", me.status_code)
    print("me_status=", (me.json() or {}).get("status"))


if __name__ == "__main__":
    main()
