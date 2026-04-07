from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.security import create_access_token # Added
from authlib.integrations.starlette_client import OAuth
from starlette.responses import RedirectResponse
import os
import json
import pyotp
import qrcode
import io
import base64
import logging
import threading
import redis
from datetime import datetime, timedelta
from app.models.ledger import UserExt
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)

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

# v4.7.3: Alibaba Open Platform OAuth for Sourcing & Arbitrage
oauth.register(
    name='alibaba',
    client_id=settings.ALIBABA_1688_API_KEY,
    client_secret=os.getenv("ALIBABA_1688_API_SECRET", ""),
    authorize_url='https://oauth.alibaba.com/authorize',
    access_token_url='https://oauth.alibaba.com/token',
    # scope matches Alibaba Open Platform's standard requirements
)

from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
async def login_v46(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    v4.6: Secure Admin & User Login.
    Supports default admin from ENV.
    """
    user = db.query(UserExt).filter(UserExt.email == login_data.email).first()
    
    # 1. Default Admin Logic (Bootstrap)
    if login_data.email == settings.DEFAULT_ADMIN_EMAIL and login_data.password == settings.DEFAULT_ADMIN_PASSWORD:
        if not user:
            # Create the admin user if it doesn't exist
            user = UserExt(
                email=settings.DEFAULT_ADMIN_EMAIL,
                first_name="Admin",
                last_name="Boss",
                user_type="admin",
                is_active=True,
                referral_code="ADMIN01"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Ensure the existing user has admin type
            if user.user_type != "admin":
                user.user_type = "admin"
                db.commit()
    
    # 2. General Authentication (placeholder for real hashed password check if needed)
    # For now, we only allow the hardcoded admin or existing users via OAuth.
    if login_data.email == settings.DEFAULT_ADMIN_EMAIL and login_data.password == settings.DEFAULT_ADMIN_PASSWORD:
        pass
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials or please use OAuth")

    # 3. Issue JWT
    access_token = create_access_token(subject=user.customer_id)
    
    # 4. Set Secure Cookie
    is_prod = settings.ENVIRONMENT == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=60 * 24 * 7 * 60,
        samesite="lax",
        secure=is_prod,
        path="/"
    )
    
    return {
        "status": "success",
        "user": {
            "email": user.email,
            "user_type": user.user_type,
            "customer_id": user.customer_id
        }
    }

@router.post("/check-2fa")
async def check_2fa_status(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")
    if not email:
        return {"required": False}

    print(f"Checking 2FA status for email: {email}")
    
    # v3.7.6: Fixed "Cross-User" 2FA bug. Look up user by email directly.
    # No more hardcoded 8829 for status check.
    user = db.query(UserExt).filter(UserExt.email == email).first()
    if user and user.is_two_factor_enabled:
        print(f"2FA is ENABLED for {email}")
        return {"required": True}
    
    return {"required": False}

@router.post("/2fa/setup")
async def setup_2fa(request: Request, db: Session = Depends(get_db)):
    """
    v3.7.6: In production, we extract user_id from the JWT token.
    For setup, the user MUST be logged in.
    Refactored to use Depends(get_current_user).
    """
    return {"error": "Use the authenticated setup endpoint"}

@router.post("/2fa/setup-authenticated")
async def setup_2fa_authenticated(
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.7.6: Secure 2FA setup for the CURRENT authenticated user.
    """
    user = current_user
    
    if not user.two_factor_secret:
        user.two_factor_secret = pyotp.random_base32()
        db.commit()

    totp = pyotp.TOTP(user.two_factor_secret)
    provisioning_uri = totp.provisioning_uri(name=f"0Buck:{user.email}", issuer_name="0Buck")
    
    # Generate QR Code
    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_base64 = base64.b64encode(buf.getvalue()).decode()

    # v3.7.6: We also provide 'Backup Codes' in a real production system.
    return {
        "secret": user.two_factor_secret,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "instructions": "Please save your secret key in a safe place. If you lose your phone, this is the only way to recover access."
    }

@router.post("/2fa/enable")
async def enable_2fa(
    request: Request, 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.7.6: Enable 2FA for the authenticated user.
    """
    data = await request.json()
    code = data.get("code")
    user = current_user
    
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
async def disable_2fa(
    request: Request, 
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.7.6: Disable 2FA for the CURRENT authenticated user.
    """
    data = await request.json()
    code = data.get("code")
    user = current_user
    
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

# v3.5.0: Redis-based Global Rate Limiter for Brute-Force Defense
# Supports multi-process deployments (e.g. Railway, Docker)
try:
    redis_client = redis.from_url(settings.REDIS_URI, decode_responses=True)
    redis_client.ping()
    HAS_REDIS = True
except Exception as e:
    logger.error(f"Redis connection failed: {e}")
    HAS_REDIS = False
    # Fallback to In-Memory for dev if Redis is missing
    login_attempts = {}
    login_attempts_lock = threading.Lock()

def check_rate_limit(email: str, ip: Optional[str] = None) -> bool:
    """Returns True if user or IP is blocked, False otherwise."""
    now = datetime.now()
    if HAS_REDIS:
        # Check by Email
        email_key = f"ratelimit:login:{email}"
        # Check by IP (v3.8.2 Throttling)
        ip_key = f"ratelimit:ip:{ip}" if ip else None
        
        try:
            # 1. Check Email-based limit
            data = redis_client.get(email_key)
            if data:
                attempts = json.loads(data)
                if attempts["count"] >= 5 and (now - datetime.fromisoformat(attempts["last_attempt"])).seconds < 300:
                    return True
            
            # 2. Check IP-based limit (Brute force defense)
            if ip_key:
                ip_data = redis_client.get(ip_key)
                if ip_data:
                    ip_attempts = int(ip_data)
                    if ip_attempts >= 20: # Limit 20 attempts per 5 mins per IP
                        return True
        except Exception as e:
            logger.error(f"Rate limit check failed for {email}: {e}")
        return False
    else:
        # Fallback to In-Memory
        with login_attempts_lock:
            attempts = login_attempts.get(email, {"count": 0, "last_attempt": now})
            if attempts["count"] >= 5 and (now - attempts["last_attempt"]).seconds < 300:
                return True
            return False

def record_login_attempt(email: str, success: bool, ip: Optional[str] = None):
    """Updates the login attempt counter for both email and IP."""
    now = datetime.now()
    if HAS_REDIS:
        email_key = f"ratelimit:login:{email}"
        ip_key = f"ratelimit:ip:{ip}" if ip else None
        
        try:
            if success:
                redis_client.delete(email_key)
            else:
                # Email counter
                data = redis_client.get(email_key)
                attempts = json.loads(data) if data else {"count": 0, "last_attempt": now.isoformat()}
                attempts["count"] += 1
                attempts["last_attempt"] = now.isoformat()
                redis_client.setex(email_key, 900, json.dumps(attempts))
                
                # IP counter (Aggressive throttling)
                if ip_key:
                    redis_client.incr(ip_key)
                    redis_client.expire(ip_key, 300)
        except Exception as e:
            logger.error(f"Failed to record login attempt for {email}: {e}")
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
async def verify_login_2fa(
    request: Request, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    v3.7.6: Secure 2FA verification with email-specific lookup.
    v3.8.2: Enhanced with IP Throttling and New IP Detection.
    """
    data = await request.json()
    email = data.get("email")
    code = data.get("code")
    current_ip = request.client.host if request.client else "unknown"
    
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
        
    # 1. Global Rate Limiting Check (Email + IP)
    if check_rate_limit(email, ip=current_ip):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")

    # v3.7.6: Fixed "Cross-User" 2FA bug. Look up user by email.
    user = db.query(UserExt).filter(UserExt.email == email).first()
    if not user or not user.is_two_factor_enabled:
        return {"status": "success"}

    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(code):
        # Success! Reset attempts
        record_login_attempt(email, success=True, ip=current_ip)
        
        # v3.8.2: New IP Detection
        if user.last_login_ip and user.last_login_ip != current_ip:
            msg = f"🔔 Security Notice: New login detected from IP {current_ip}. If this wasn't you, please secure your account."
            print(f"NEW IP ALERT for User {user.customer_id}: {msg}")
            
            # Use BackgroundTask for alert to avoid latency
            from app.services.social_automation import SocialAutomationService
            social_service = SocialAutomationService(db)
            background_tasks.add_task(social_service.send_nudge, user.customer_id, msg)
        
        user.last_login_ip = current_ip
        user.last_login_at = datetime.utcnow()
        db.commit()
        
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
        record_login_attempt(email, success=False, ip=current_ip)
        raise HTTPException(status_code=400, detail="Invalid verification code.")

@router.post("/payment-password/set")
async def set_payment_password(
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.8.0: Initial set of payment password.
    Requires 2FA verification if 2FA is enabled.
    """
    data = await request.json()
    new_password = data.get("password")
    code_2fa = data.get("code_2fa")

    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 digits")

    # If 2FA is enabled, MUST verify code before setting password
    if current_user.is_two_factor_enabled:
        if not code_2fa:
            raise HTTPException(status_code=400, detail="2FA code required to set payment password")
        totp = pyotp.TOTP(current_user.two_factor_secret)
        if not totp.verify(code_2fa):
            raise HTTPException(status_code=400, detail="Invalid 2FA code")

    from app.core.security import get_password_hash
    current_user.hashed_payment_password = get_password_hash(new_password)
    db.commit()
    return {"status": "success", "message": "Payment password set successfully"}

@router.post("/payment-password/verify")
async def verify_payment_password_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.8.0: Internal verification for sensitive actions.
    Includes brute-force protection (5 attempts).
    """
    data = await request.json()
    password = data.get("password")

    if not current_user.hashed_payment_password:
        raise HTTPException(status_code=400, detail="Payment password not set")

    # Check lockout
    now = datetime.utcnow()
    if current_user.payment_pass_locked_until and current_user.payment_pass_locked_until > now:
        diff = (current_user.payment_pass_locked_until - now).seconds // 60
        raise HTTPException(status_code=429, detail=f"Too many failed attempts. Locked for {diff} more minutes.")

    from app.core.security import verify_password
    if verify_password(password, current_user.hashed_payment_password):
        # Reset failed attempts on success
        current_user.payment_pass_failed_attempts = 0
        current_user.payment_pass_locked_until = None
        db.commit()
        return {"status": "success"}
    else:
        # Increment failed attempts
        current_user.payment_pass_failed_attempts += 1
        if current_user.payment_pass_failed_attempts >= 5:
            current_user.payment_pass_locked_until = now + timedelta(hours=24)
            db.commit()
            raise HTTPException(status_code=429, detail="5 failed attempts. Account locked for 24 hours.")
        
        db.commit()
        remaining = 5 - current_user.payment_pass_failed_attempts
        raise HTTPException(status_code=400, detail=f"Invalid payment password. {remaining} attempts remaining.")

@router.post("/payment-password/reset-with-2fa")
async def reset_payment_password_2fa(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user)
):
    """
    v3.8.0: Automated Reset via 2FA (Primary Recovery Path).
    Principle: Auto > AI > Human.
    """
    data = await request.json()
    code_2fa = data.get("code_2fa")
    new_password = data.get("new_password")

    if not current_user.is_two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA must be enabled to use auto-reset. Please contact Dumbo AI.")

    if not code_2fa or not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Invalid input or password too short")

    # Verify 2FA
    totp = pyotp.TOTP(current_user.two_factor_secret)
    if not totp.verify(code_2fa):
        raise HTTPException(status_code=400, detail="Invalid 2FA code")

    # Auto-Reset
    from app.core.security import get_password_hash
    current_user.hashed_payment_password = get_password_hash(new_password)
    current_user.payment_pass_failed_attempts = 0
    current_user.payment_pass_locked_until = None
    
    # v3.8.1: Record Event and Sync Alert
    # 1. Log to Security Trail
    from app.models.ledger import AdminAuditLog
    audit = AdminAuditLog(
        admin_id=1, # System
        action="PAYMENT_PASS_RESET",
        target_id=str(current_user.customer_id),
        payload={"method": "2FA_Self_Service", "ip": request.client.host if request.client else "unknown"}
    )
    db.add(audit)
    db.commit()

    # 2. Sync Alert via Dumbo AI (Background task)
    # Notify user on all channels about this sensitive change
    msg = "⚠️ Security Alert: Your payment password was just reset via 2FA. If this wasn't you, please freeze your account immediately via Dumbo AI Concierge!"
    
    from app.services.social_automation import SocialAutomationService
    social_service = SocialAutomationService(db)
    background_tasks.add_task(social_service.send_nudge, current_user.customer_id, msg)
    
    print(f"SECURITY ALERT SENT TO USER {current_user.customer_id}: {msg}")

    return {"status": "success", "message": "Payment password reset automatically. Security alerts sent."}

@router.get("/login/{provider}")
async def login(provider: str, request: Request):
    if provider not in ['google', 'apple', 'facebook', 'alibaba']:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    # v4.7.3: Handle Alibaba-specific redirect logic
    redirect_uri = request.url_for('auth_callback', provider=provider)
    return await oauth.create_client(provider).authorize_redirect(request, str(redirect_uri))

@router.get("/callback/{provider}", name='auth_callback')
async def auth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    client = oauth.create_client(provider)
    token = await client.authorize_access_token(request)
    
    # v4.7.3: Special handling for Alibaba Token (Save to SystemConfig)
    if provider == 'alibaba':
        from app.services.config_service import ConfigService
        config = ConfigService(db)
        config.set("alibaba_access_token", token.get('access_token'), description="Alibaba OAuth Access Token")
        config.set("alibaba_refresh_token", token.get('refresh_token'), description="Alibaba OAuth Refresh Token")
        config.set("alibaba_token_expires_at", token.get('expires_at'), description="Alibaba Token Expiry Timestamp")
        
        db.commit()
        frontend_url = settings.ALLOWED_ORIGINS.split(",")[0]
        return RedirectResponse(url=f"{frontend_url}/admin/dashboard?alibaba_auth=success")

    user_info = None
    if provider == 'google':
        user_info = token.get('userinfo')
    elif provider == 'facebook':
        resp = await client.get('me?fields=id,name,email', token=token)
        user_info = resp.json()
    elif provider == 'apple':
        user_info = token.get('userinfo') 

    if not user_info:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    email = user_info.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by OAuth provider")

    # v3.7.6: REAL user lookup by email.
    user = db.query(UserExt).filter(UserExt.email == email).first()
    
    # If user doesn't exist, create them (First-time OAuth login)
    if not user:
        # In v3.7.6, we ensure every new user gets a real record
        user = UserExt(
            email=email,
            first_name=user_info.get('given_name', user_info.get('name', 'User')),
            last_name=user_info.get('family_name', ''),
            user_type='customer',
            is_active=True
        )
        db.add(user)
        db.flush() # Get customer_id
        user.referral_code = f"REF{user.customer_id}"
        db.commit()

    frontend_url = settings.ALLOWED_ORIGINS.split(",")[0]
    
    if user.is_two_factor_enabled:
        # Redirect to 2FA verification page on frontend
        return RedirectResponse(url=f"{frontend_url}/?2fa_required=true&email={email}&provider={provider}")

    # Generate JWT Token for v3.5.0 Security
    access_token = create_access_token(subject=user.customer_id)
    
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
