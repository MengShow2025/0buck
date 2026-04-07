from fastapi import APIRouter, Request, Header, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Any
from app.db.session import get_db
from app.models.butler import UserIMBinding
from app.services.agent import run_agent
from app.core.config import settings
from app.api.deps import get_current_user
import json
import httpx
import asyncio
import logging
import base64
import hashlib
import hmac
from datetime import datetime
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

def detect_language(text: str) -> str:
    """v5.5.23: Simple language detection (English vs Chinese)."""
    # Check if text contains more than 50% Chinese characters
    chinese_chars = len([c for c in text if '\u4e00' <= c <= '\u9fff'])
    if chinese_chars > 0:
        return "zh"
    return "en"

async def get_feishu_tenant_access_token():
    """v5.5.10: Fetch Tenant Access Token for Lark API."""
    # v5.5.11: Strip whitespace/newlines for robustness
    app_id = settings.FEISHU_APP_ID.strip() if settings.FEISHU_APP_ID else ""
    app_secret = settings.FEISHU_APP_SECRET.strip() if settings.FEISHU_APP_SECRET else ""
    
    if not app_id or not app_secret:
        logger.error("❌ Feishu APP_ID or APP_SECRET is missing in environment!")
        return None

    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {
        "app_id": app_id,
        "app_secret": app_secret
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload)
            data = response.json()
            if data.get("code") == 0:
                return data.get("tenant_access_token")
            logger.error(f"❌ Failed to get Feishu token: {data}")
        except Exception as e:
            logger.error(f"❌ Feishu Token Error: {str(e)}")
    return None

async def send_feishu_message(receive_id: str, receive_id_type: str, content: str, msg_type: str = "text"):
    """v5.5.10: Send a message back to the user via Lark API."""
    logger.info(f"📤 Attempting to send Feishu message to {receive_id}...")
    token = await get_feishu_tenant_access_token()
    if not token:
        logger.error("❌ Aborting send: No tenant_access_token")
        return
        
    url = f"https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type={receive_id_type}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    
    # Text content must be JSON stringified for Feishu
    if msg_type == "text":
        payload_content = json.dumps({"text": content})
    else:
        payload_content = content # Assume cards are already JSON strings
        
    payload = {
        "receive_id": receive_id,
        "msg_type": msg_type,
        "content": payload_content
    }
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, json=payload, headers=headers)
            res_data = res.json()
            if res_data.get("code") == 0:
                logger.info(f"✅ Feishu Message Sent Successfully to {receive_id}")
            else:
                logger.error(f"❌ Feishu API Error: {res_data}")
        except Exception as e:
            logger.error(f"❌ Feishu Send Error: {str(e)}")

def generate_binding_sig(platform: str, uid: str) -> str:
    """v5.5.8: Generate a secure HMAC signature for identity binding."""
    msg = f"{platform}:{uid}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()

class AESCipher:
    def __init__(self, key):
        self.key = hashlib.sha256(key.encode("utf-8")).digest()

    def decrypt(self, encrypt_text):
        try:
            encrypt_bytes = base64.b64decode(encrypt_text)
            iv = encrypt_bytes[:16]
            cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            plaintext = decryptor.update(encrypt_bytes[16:]) + decryptor.finalize()
            # Remove PKCS7 padding
            padding_len = plaintext[-1]
            return plaintext[:-padding_len].decode("utf-8")
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            return None

# In-memory store for deduplication
processed_events = set()

router = APIRouter()

@router.get("/feishu/test")
async def test_feishu_connectivity():
    """v5.5.18: Ultra-Robust Diagnostic with Auto-Cleaning for Boss"""
    # v5.5.18: Force cleaning for UI-entered values with backticks or spaces
    app_id = settings.FEISHU_APP_ID.strip().replace("`", "") if settings.FEISHU_APP_ID else ""
    app_secret = settings.FEISHU_APP_SECRET.strip().replace("`", "") if settings.FEISHU_APP_SECRET else ""
    backend_url = settings.BACKEND_URL.strip().replace("`", "") if settings.BACKEND_URL else ""
    
    return {
        "version": "v5.5.18-AUTO-CLEAN",
        "timestamp": datetime.now().isoformat(),
        "status": "ok", 
        "credentials_status": {
            "FEISHU_APP_ID": "✅ SET" if app_id else "❌ MISSING",
            "FEISHU_APP_SECRET": "✅ SET" if app_secret else "❌ MISSING",
            "BACKEND_URL": f"✅ {backend_url}" if backend_url else "❌ MISSING"
        },
        "instruction": "If you see ❌, please go to Railway Variables, ADD the key, and click REDEPLOY."
    }

@router.post("/feishu")
@router.post("/feishu/") # v5.5.4: Handle trailing slash variants
async def feishu_webhook(request: Request):
    """
    v5.5.15: Ultra-Robust Feishu Webhook Handler with Full Payload Logging.
    """
    try:
        raw_body = await request.body()
        if not raw_body:
            logger.warning("⚠️ Received empty body from Feishu")
            return JSONResponse(content={"status": "empty"}, status_code=200)
            
        payload = json.loads(raw_body)
        logger.info(f"📡 Incoming Feishu Webhook Payload: {json.dumps(payload)[:500]}...") # Log first 500 chars
        
        # 0. HANDLE ENCRYPTION (v5.5.5) - NOW OPTIONAL (v5.5.6)
        if "encrypt" in payload:
            if not settings.FEISHU_ENCRYPT_KEY:
                # If encrypted but no key, we try to see if it's a legacy plain request mistakenly wrapped
                # (unlikely, but we log and fail gracefully)
                logger.error("❌ Feishu payload is encrypted but FEISHU_ENCRYPT_KEY is missing!")
                return JSONResponse(content={"status": "error", "msg": "Please set FEISHU_ENCRYPT_KEY or disable encryption in Feishu"}, status_code=200)
            
            cipher = AESCipher(settings.FEISHU_ENCRYPT_KEY)
            decrypted_str = cipher.decrypt(payload["encrypt"])
            if not decrypted_str:
                return JSONResponse(content={"status": "error", "msg": "decryption_failed"}, status_code=200)
            
            payload = json.loads(decrypted_str)
            logger.info("✅ Feishu payload decrypted successfully")
        else:
            # v5.5.6: Zero-Config Path - Plain JSON (Encryption Disabled in Feishu)
            logger.debug("ℹ️ Processing plain (unencrypted) Feishu payload")

        # 0.5. VERIFY TOKEN (v5.5.5) - OPTIONAL
        if settings.FEISHU_VERIFY_TOKEN:
            received_token = payload.get("token") or payload.get("header", {}).get("token")
            if received_token and received_token != settings.FEISHU_VERIFY_TOKEN:
                logger.warning(f"⚠️ Feishu token mismatch: expected {settings.FEISHU_VERIFY_TOKEN[:4]}..., got {received_token}")
                # We won't block yet, but we'll log it clearly.

        # 1. IMMEDIATE CHALLENGE RESPONSE (Highest Priority)
        if payload.get("type") == "url_verification":
            challenge = payload.get("challenge")
            return JSONResponse(content={"challenge": challenge}, status_code=200)
        
        # v5.5.20: DUPLICATE PREVENTION
        event_id = payload.get("header", {}).get("event_id")
        if event_id:
            if event_id in processed_events:
                logger.info(f"♻️ Skipping duplicate Feishu Event: {event_id}")
                return JSONResponse(content={"status": "duplicate_ignored"}, status_code=200)
            
            # Add to set and keep it reasonably sized
            processed_events.add(event_id)
            if len(processed_events) > 1000:
                processed_events.clear() # Simple rotation
            logger.info(f"🆔 Processing Feishu Event: {event_id}")

        # 2. EVENT PROCESSING
        event = payload.get("event", {})
        message = event.get("message", {})
        sender = event.get("sender", {})
        
        # v5.5.7: Capture both Sender and Chat Context
        sender_id = sender.get("sender_id", {}).get("open_id")
        chat_id = message.get("chat_id")
        chat_type = message.get("chat_type") # 'p2p' or 'group'
        
        if not sender_id or not message:
            return JSONResponse(content={"status": "ignored"}, status_code=200)

        # 2.5. GROUP FILTER (v5.5.7)
        # In groups, we only respond if explicitly mentioned (unless it's a P2P chat)
        content_raw = message.get("content", "{}")
        try:
            content_obj = json.loads(content_raw)
            text_content = content_obj.get("text", "").strip()
        except:
            text_content = ""

        if chat_type == "group":
            # Check for @mentions in Feishu event
            mentions = message.get("mentions", [])
            is_mentioned = any(m.get("name") == settings.PROJECT_NAME or m.get("id", {}).get("open_id") == settings.FEISHU_APP_ID for m in mentions)
            
            # If not mentioned, we still record the interaction silently (Optional: for individual profiling)
            if not is_mentioned and not text_content.startswith("/"):
                logger.debug(f"🤫 Silent profiling for {sender_id} in group {chat_id}")
                # Future: run_butler_learning silently here
                return JSONResponse(content={"status": "silent_recorded"}, status_code=200)

        if not text_content:
            return JSONResponse(content={"status": "no_text"}, status_code=200)

        # 3. BRAIN ROUTING
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            # v5.5.23: Detect language for initial responses
            lang = detect_language(text_content)
            
            binding = db.query(UserIMBinding).filter_by(platform="feishu", platform_uid=sender_id, is_active=True).first()
            
            # v5.5.8: IDENTITY BRIDGE (Mandatory Binding)
            if not binding:
                sig = generate_binding_sig("feishu", sender_id)
                base_url = settings.BACKEND_URL.rstrip("/")
                bind_url = f"{base_url}/auth/bind?platform=feishu&uid={sender_id}&sig={sig}"
                
                logger.info(f"🆕 New Feishu User {sender_id}: Sending binding invitation ({lang})")
                
                if lang == "zh":
                    invitation_text = (
                        "👋 您好！我是您的 0Buck AI 管家。\n\n"
                        "为了给您提供专属的选品推荐、订单查询和智脑记忆服务，请先关联您的 0Buck 账号：\n\n"
                        f"🔗 点击登录获得完整服务: {bind_url} \n\n"
                        "绑定后，我将成为您在飞书里的“数字选品大脑”！"
                    )
                else:
                    invitation_text = (
                        "👋 Hello! I'm your 0Buck AI Butler.\n\n"
                        "To provide personalized sourcing recommendations, order tracking, and AI memory services, please link your 0Buck account first:\n\n"
                        f"🔗 Login for full service: {bind_url} \n\n"
                        "Once linked, I'll be your 'Digital Sourcing Brain' right here in Feishu!"
                    )
                
                # v5.5.10: Send via Lark API (Async)
                asyncio.create_task(send_feishu_message(sender_id, "open_id", invitation_text))
                return JSONResponse(content={"status": "binding_sent"}, status_code=200)

            user_id = binding.user_id
            session_id = f"feishu_{chat_id}_{sender_id}" if chat_type == "group" else f"feishu_{sender_id}"
            
            # v5.5.12: Background Task Execution
            # v5.5.13: Send an immediate "Thinking..." status feedback.
            async def background_ai_process(text, uid, sid, u_id, language):
                try:
                    # v5.5.13: Provide immediate visual feedback to user
                    thinking_msg = "🔍 0Buck 智脑正在深度思考中，请稍等片刻..." if language == "zh" else "🔍 0Buck AI Brain is thinking deeply, please wait a moment..."
                    await send_feishu_message(uid, "open_id", thinking_msg)
                    
                    logger.info(f"🧠 AI Brain starting background process for User {u_id} ({language})")
                    ai_response = await run_agent(
                        content=text, 
                        user_id=u_id,
                        session_id=sid
                    )
                    await send_feishu_message(uid, "open_id", ai_response.get("content", "Brain is thinking..."))
                    logger.info(f"✅ AI Brain background process complete for User {u_id}")
                except Exception as ex:
                    logger.error(f"❌ Background AI Process Error: {str(ex)}")

            asyncio.create_task(background_ai_process(text_content, sender_id, session_id, user_id, lang))
            
            return JSONResponse(content={"status": "processing_started"}, status_code=200)
        finally:
            db.close()

    except Exception as e:
        logger.error(f"❌ Feishu Critical Error: {str(e)}")
        # Still return 200 to Feishu to avoid retries, but log the error
        return JSONResponse(content={"status": "error", "msg": str(e)}, status_code=200)

@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """v5.5: Unified IM Gateway - WhatsApp Adapter (Refactored)"""
    # ... logic similar to Feishu but using WhatsApp Cloud API format ...
    return {"status": "ok"}

@router.get("/bind")
async def process_im_binding(
    platform: str = Query(...),
    uid: str = Query(...),
    sig: str = Query(...),
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    v5.5.8: Secure Identity Bridge.
    Links the logged-in 0Buck user to their IM identity.
    """
    # 1. Verify Signature
    expected_sig = generate_binding_sig(platform, uid)
    if not hmac.compare_digest(sig, expected_sig):
        raise HTTPException(status_code=403, detail="Invalid binding signature")
    
    # 2. Check for Existing Binding
    existing = db.query(UserIMBinding).filter_by(platform=platform, platform_uid=uid, is_active=True).first()
    if existing:
        if existing.user_id == current_user.customer_id:
            return {"status": "already_bound", "message": f"Account already linked to {platform}"}
        else:
            # Re-bind to new user
            existing.is_active = False
            db.add(existing)
    
    # 3. Create New Binding
    new_binding = UserIMBinding(
        user_id=current_user.customer_id,
        platform=platform,
        platform_uid=uid,
        is_active=True
    )
    db.add(new_binding)
    db.commit()
    
    logger.info(f"✅ Identity Bridge Success: Linked User {current_user.customer_id} to {platform}:{uid}")
    
    return {
        "status": "success", 
        "message": f"Successfully linked your 0Buck account to {platform}!",
        "user_name": f"{current_user.first_name} {current_user.last_name}"
    }
