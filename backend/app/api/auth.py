from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.security import create_access_token # Added
from authlib.integrations.starlette_client import OAuth
from starlette.responses import RedirectResponse
import json
import pyotp
import qrcode
import io
import base64
from app.models.ledger import UserExt

router = APIRouter()

oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

oauth.register(
    name='facebook',
    client_id=settings.FACEBOOK_CLIENT_ID,
    client_secret=settings.FACEBOOK_CLIENT_SECRET,
    api_base_url='https://graph.facebook.com/',
    access_token_url='https://graph.facebook.com/v12.0/oauth/access_token',
    authorize_url='https://www.facebook.com/v12.0/dialog/oauth',
    client_kwargs={'scope': 'email public_profile'}
)

# Apple requires more complex configuration with private keys
oauth.register(
    name='apple',
    client_id=settings.APPLE_CLIENT_ID,
    client_secret=settings.APPLE_CLIENT_SECRET,
    authorize_url='https://appleid.apple.com/auth/authorize',
    access_token_url='https://appleid.apple.com/auth/token',
    client_kwargs={'scope': 'name email'}
)

@router.post("/check-2fa")
async def check_2fa_status(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")
    print(f"Checking 2FA status for email: {email}")
    
    # v3.4.6: In this demo, all logins are mapped to user 8829 (Julian Rossi)
    # This ensures that if the user enables 2FA on the Me page, 
    # any subsequent login with a standard email will trigger the 2FA challenge.
    user = db.query(UserExt).filter(UserExt.customer_id == 8829).first()
    if user and user.is_two_factor_enabled:
        print(f"2FA is ENABLED for user 8829")
        return {"required": True}
    
    print(f"2FA is DISABLED for user 8829")
    return {"required": False}

@router.post("/2fa/setup")
async def setup_2fa(request: Request, db: Session = Depends(get_db)):
    # In v3.4 we simulate the current user. In prod, use JWT/Session.
    # For now, we use a fixed user ID for testing or the email if provided in session.
    user_id = 8829 # Default Node ID from MeView.tsx
    user = db.query(UserExt).filter(UserExt.customer_id == user_id).first()
    
    if not user:
        # Create user if doesn't exist for demo
        user = UserExt(customer_id=user_id, referral_code=f"REF{user_id}")
        db.add(user)
        db.commit()

    if not user.two_factor_secret:
        user.two_factor_secret = pyotp.random_base32()
        db.commit()

    totp = pyotp.TOTP(user.two_factor_secret)
    provisioning_uri = totp.provisioning_uri(name="0Buck", issuer_name="0Buck")
    
    # Generate QR Code
    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_base64 = base64.b64encode(buf.getvalue()).decode()

    return {
        "secret": user.two_factor_secret,
        "qr_code": f"data:image/png;base64,{qr_base64}"
    }

@router.post("/2fa/enable")
async def enable_2fa(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    code = data.get("code")
    user_id = 8829 # Simulated current user
    
    user = db.query(UserExt).filter(UserExt.customer_id == user_id).first()
    if not user or not user.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA not set up")

    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(code):
        user.is_two_factor_enabled = True
        db.commit()
        return {"status": "success"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

@router.post("/2fa/disable")
async def disable_2fa(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    code = data.get("code")
    user_id = 8829
    
    user = db.query(UserExt).filter(UserExt.customer_id == user_id).first()
    if not user or not user.is_two_factor_enabled:
        return {"status": "success"}

    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(code):
        user.is_two_factor_enabled = False
        user.two_factor_secret = None
        db.commit()
        return {"status": "success"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

import threading
import redis
import json
from datetime import datetime, timedelta

# v3.5.0: Redis-based Global Rate Limiter for Brute-Force Defense
# Supports multi-process deployments (e.g. Railway, Docker)
try:
    redis_client = redis.from_url(settings.REDIS_URI, decode_responses=True)
    redis_client.ping()
    HAS_REDIS = True
except Exception:
    HAS_REDIS = False
    # Fallback to In-Memory for dev if Redis is missing
    login_attempts = {}
    login_attempts_lock = threading.Lock()

def check_rate_limit(email: str) -> bool:
    """Returns True if user is blocked, False otherwise."""
    now = datetime.now()
    if HAS_REDIS:
        key = f"ratelimit:login:{email}"
        data = redis_client.get(key)
        if data:
            attempts = json.loads(data)
            # If more than 5 failed attempts in last 5 minutes, block
            if attempts["count"] >= 5 and (now - datetime.fromisoformat(attempts["last_attempt"])).seconds < 300:
                return True
        return False
    else:
        with login_attempts_lock:
            attempts = login_attempts.get(email, {"count": 0, "last_attempt": now})
            if attempts["count"] >= 5 and (now - attempts["last_attempt"]).seconds < 300:
                return True
            return False

def record_login_attempt(email: str, success: bool):
    """Updates the login attempt counter."""
    now = datetime.now()
    if HAS_REDIS:
        key = f"ratelimit:login:{email}"
        if success:
            redis_client.delete(key)
        else:
            data = redis_client.get(key)
            attempts = json.loads(data) if data else {"count": 0, "last_attempt": now.isoformat()}
            
            # Reset if old
            if (now - datetime.fromisoformat(attempts["last_attempt"])).seconds > 300:
                attempts["count"] = 1
            else:
                attempts["count"] += 1
            
            attempts["last_attempt"] = now.isoformat()
            redis_client.setex(key, 900, json.dumps(attempts)) # Keep record for 15 mins
    else:
        with login_attempts_lock:
            if success:
                login_attempts[email] = {"count": 0, "last_attempt": now}
            else:
                attempts = login_attempts.get(email, {"count": 0, "last_attempt": now})
                if (now - attempts["last_attempt"]).seconds > 300:
                    attempts["count"] = 1
                else:
                    attempts["count"] += 1
                attempts["last_attempt"] = now
                login_attempts[email] = attempts

@router.post("/2fa/verify-login")
async def verify_login_2fa(request: Request, db: Session = Depends(get_db)):
    """
    v3.5.0: Secure 2FA verification with Global Redis Rate Limiting.
    """
    data = await request.json()
    email = data.get("email")
    code = data.get("code")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
        
    # 1. Global Rate Limiting Check
    if check_rate_limit(email):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again in 5 minutes.")

    # In a real app, find user by email. Here we use 8829.
    user = db.query(UserExt).filter(UserExt.customer_id == 8829).first()
    if not user or not user.is_two_factor_enabled:
        return {"status": "success"}

    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(code):
        # Success! Reset attempts
        record_login_attempt(email, success=True)
        
        # Issue JWT for v3.5.0 Security
        access_token = create_access_token(subject=user.customer_id)
        
        response = Response(content=json.dumps({"status": "success", "user_id": user.customer_id}), media_type="application/json")
        
        # v3.5.0 Secure Cookie Configuration for Production
        is_prod = settings.ENVIRONMENT == "production"
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=60 * 24 * 7 * 60, # 7 days
            expires=60 * 24 * 7 * 60,
            samesite="lax",
            secure=is_prod, # Only enforce secure over HTTPS in production
            path="/",
            domain=settings.COOKIE_DOMAIN if hasattr(settings, "COOKIE_DOMAIN") else None
        )
        return response
    else:
        # Failed attempt: Record it
        record_login_attempt(email, success=False)
        raise HTTPException(status_code=400, detail="Invalid verification code.")

@router.get("/login/{provider}")
async def login(provider: str, request: Request):
    if provider not in ['google', 'apple', 'facebook']:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    redirect_uri = request.url_for('auth_callback', provider=provider)
    return await oauth.create_client(provider).authorize_redirect(request, str(redirect_uri))

@router.get("/callback/{provider}", name='auth_callback')
async def auth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client(provider)
    token = await client.authorize_access_token(request)
    
    user_info = None
    if provider == 'google':
        user_info = token.get('userinfo')
    elif provider == 'facebook':
        resp = await client.get('me?fields=id,name,email', token=token)
        user_info = resp.json()
    elif provider == 'apple':
        # Apple returns user info in the first request only
        user_info = token.get('userinfo') 

    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    email = user_info.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by OAuth provider")

    # Check if this user has 2FA enabled
    # In this demo, we check user 8829 as a proxy for the test user
    user = db.query(UserExt).filter(UserExt.customer_id == 8829).first()
    frontend_url = settings.ALLOWED_ORIGINS.split(",")[0]
    
    if user and user.is_two_factor_enabled:
        # Redirect to 2FA verification page on frontend
        return RedirectResponse(url=f"{frontend_url}/?2fa_required=true&email={email}&provider={provider}")

    # Generate JWT Token for v3.5.0 Security
    access_token = create_access_token(subject=user.customer_id if user else 8829)
    
    response = RedirectResponse(url=f"{frontend_url}/?auth_success=true&email={email}")
    
    # v3.5.0 Secure Cookie Configuration for Production
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=60 * 24 * 7 * 60, # 7 days
        expires=60 * 24 * 7 * 60,
        samesite="lax",
        secure=is_prod, # Only enforce secure over HTTPS in production
        path="/",
        domain=settings.COOKIE_DOMAIN if hasattr(settings, "COOKIE_DOMAIN") else None
    )
    return response
