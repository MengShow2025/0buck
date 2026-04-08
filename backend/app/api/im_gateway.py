import os
from app.db.session import get_db, SessionLocal
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
from typing import Any, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

# --- 1. CORE UTILITIES ---

def detect_language(text: str) -> str:
    """v5.6.8: Enhanced Language Heuristic with English Fallback."""
    if not text: return "en"
    # Check for Japanese (Hiragana/Katakana)
    if any('\u3040' <= c <= '\u309f' or '\u30a0' <= c <= '\u30ff' for c in text):
        return "ja"
    # Check for Chinese (CJK Unified Ideographs)
    if any('\u4e00' <= c <= '\u9fff' for c in text):
        return "zh"
    # Check for Spanish/European (Special characters)
    if any(c in 'áéíóúüñ¿¡' for c in text.lower()):
        return "es"
    # Default to English
    return "en"

def generate_binding_sig(platform: str, uid: str) -> str:
    """v5.5.8: Generate a secure HMAC signature for identity bridge."""
    msg = f"{platform}:{uid}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()

# --- 2. MULTI-PLATFORM BRAIN PROXY ---

async def send_rich_message(platform: str, uid: str, text: str, title: str, link_url: Optional[str] = None, lang: str = "en"):
    """v5.7.14: Language-adaptive Rich Message Dispatcher."""
    if platform == "feishu":
        await send_feishu_rich_link(uid, text, title, link_url, lang)
    elif platform == "telegram":
        # Telegram Markdown Link
        msg = text
        if link_url:
            msg += f"\n\n[🔗 点击登录获得完整服务]({link_url})" if lang == "zh" else f"\n\n[🔗 Login for Full Service]({link_url})"
        await send_telegram_message(uid, msg)
    elif platform == "whatsapp":
        # WhatsApp supports preview_url for links
        msg = text
        if link_url:
            msg += f"\n\n🔗 点击登录获得完整服务: {link_url}" if lang == "zh" else f"\n\n🔗 Login for Full Service: {link_url}"
        await send_whatsapp_message(uid, msg)
    elif platform == "discord":
        # Discord Markdown Link
        msg = text
        if link_url:
            msg += f"\n\n[🔗 点击登录获得完整服务]({link_url})" if lang == "zh" else f"\n\n[🔗 Login for Full Service]({link_url})"
        await send_discord_message(uid, msg)
    else:
        # Fallback to plain text
        await send_whatsapp_message(uid, text)

async def generic_brain_process(platform: str, platform_uid: str, text: str, chat_id: str, chat_type: str, send_func):
    """
    v5.6.4: Unified Brain Proxy for all IM platforms.
    Handles Guest Mode, Identity Bridge, and AI Processing.
    """
    db = SessionLocal()
    try:
        lang = detect_language(text)
        binding = db.query(UserIMBinding).filter_by(platform=platform, platform_uid=platform_uid, is_active=True).first()
        
        user_id = binding.user_id if binding else 1
        is_guest = binding is None
        
        sig = generate_binding_sig(platform, platform_uid)
        base_url = settings.BACKEND_URL.rstrip("/")
        # v5.6.6: Add Feishu-specific immersive browser flags
        raw_bind_url = f"{base_url}/auth/bind?platform={platform}&uid={platform_uid}&sig={sig}"
        
        if platform == "feishu":
            # Force open in Feishu's internal browser
            bind_url = f"https://open.feishu.cn/open-apis/authen/v1/index?redirect_uri={raw_bind_url}&app_id={settings.FEISHU_APP_ID}"
            # Alternative: direct link with feishu internal flag
            bind_url = f"{raw_bind_url}&lk_with_external=false"
        else:
            bind_url = raw_bind_url
        
        # Composite Session for Persona Projection
        session_id = f"{platform}_{chat_id}_{platform_uid}" if chat_type == "group" else f"{platform}_{platform_uid}"
        
        # 1. Send Immediate Thinking Status (Minimal Rotating Icon)
        thinking_msg = "🌀"
        
        # v5.6.5: Thinking status shouldn't have a login link yet (too early)
        await send_rich_message(platform, platform_uid, thinking_msg, "0Buck AI Brain", None, lang)
        
        # 2. Call AI Brain
        logger.info(f"🧠 [{platform.upper()}] Process for {platform_uid} (Guest={is_guest})")
        try:
            ai_response = await run_agent(content=text, user_id=user_id, session_id=session_id)
            main_reply = ai_response.get("content")
            if not main_reply or main_reply.strip() == "":
                main_reply = "AI Brain is currently resting..." if lang == "en" else "0Buck 智脑暂时没有想好如何回复，请稍后再试。"
        except Exception as ai_err:
            logger.error(f"AI Agent Error: {ai_err}")
            main_reply = f"⚠️ 0Buck 智脑暂时无法响应: {str(ai_err)}" if lang == "zh" else f"⚠️ 0Buck AI Brain error: {str(ai_err)}"
        
        # 3. Send final response (Footer/Login link is handled elegantly by send_rich_message)
        await send_rich_message(platform, platform_uid, main_reply, "0Buck AI Brain", bind_url if is_guest else None, lang)
        logger.info(f"✅ [{platform.upper()}] Response complete for {platform_uid}")
        
    except Exception as e:
        logger.error(f"❌ [{platform.upper()}] Brain Process Error: {str(e)}")
    finally:
        db.close()

# --- 3. PLATFORM ADAPTERS ---

# --- FEISHU (LARK) ---
async def get_feishu_tenant_access_token():
    app_id = settings.FEISHU_APP_ID.strip().replace("`", "") if settings.FEISHU_APP_ID else ""
    app_secret = settings.FEISHU_APP_SECRET.strip().replace("`", "") if settings.FEISHU_APP_SECRET else ""
    if not app_id or not app_secret: return None
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, json={"app_id": app_id, "app_secret": app_secret})
            return res.json().get("tenant_access_token")
        except: return None

async def send_feishu_message(receive_id: str, content: str):
    token = await get_feishu_tenant_access_token()
    if not token: return
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"}
    payload = {"receive_id": receive_id, "msg_type": "text", "content": json.dumps({"text": content})}
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload, headers=headers)

async def send_feishu_rich_link(receive_id: str, text: str, title: str, link_url: Optional[str] = None, lang: str = "en"):
    """v5.7.14: Send Feishu Rich Text Message with language-adaptive links."""
    token = await get_feishu_tenant_access_token()
    if not token: return
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"}
    
    # Language-aware link text
    link_text = "🔗 点击登录获得完整服务" if lang == "zh" else "🔗 Login for Full Service"
    
    # Construct rich text content
    # v5.7.16: Provide both zh_cn and en_us for maximum compatibility
    content_payload = {
        "title": title,
        "content": [
            [{"tag": "text", "text": text}]
        ]
    }
    
    if link_url:
        content_payload["content"].append([
            {"tag": "a", "text": link_text, "href": link_url}
        ])

    content_obj = {
        "zh_cn": content_payload,
        "en_us": content_payload
    }

    payload = {
        "receive_id": receive_id,
        "msg_type": "post",
        "content": json.dumps(content_obj)
    }
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload, headers=headers)

# --- TELEGRAM ---
async def send_telegram_message(chat_id: str, content: str):
    """v5.6.0: Telegram Send Adapter"""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token: return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": content, "parse_mode": "Markdown"}
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload)

# --- WHATSAPP ---
async def send_whatsapp_message(to_number: str, content: str):
    """v5.6.4: WhatsApp (Meta Cloud API) Send Adapter with link preview."""
    token = settings.WHATSAPP_API_TOKEN
    phone_id = settings.WHATSAPP_PHONE_NUMBER_ID
    if not token or not phone_id: return
    url = f"https://graph.facebook.com/v17.0/{phone_id}/messages"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # v5.6.4: Added preview_url to help immersive browser opening
    payload = {
        "messaging_product": "whatsapp", 
        "to": to_number, 
        "type": "text", 
        "text": {"body": content, "preview_url": True}
    }
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload, headers=headers)

# --- DISCORD ---
async def send_discord_message(channel_id: str, content: str):
    """v5.6.4: Discord Send Adapter with Embed support for immersive links."""
    token = settings.DISCORD_BOT_TOKEN
    if not token: return
    url = f"https://discord.com/api/v10/channels/{channel_id}/messages"
    headers = {"Authorization": f"Bot {token}", "Content-Type": "application/json"}
    
    # Check if content has a link (for rich embed)
    if "http" in content and "[" in content:
        # Use simple embed for rich links
        payload = {
            "embeds": [{
                "description": content,
                "color": 0x00ff00 # Green
            }]
        }
    else:
        payload = {"content": content}
        
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload, headers=headers)

# --- 4. SHARED STATE ---
processed_events = set()

def is_duplicate(platform: str, event_id: str) -> bool:
    """v5.6.0: Global IM event deduplication."""
    if not event_id: return False
    key = f"{platform}:{event_id}"
    if key in processed_events: return True
    processed_events.add(key)
    # Simple memory cleanup: keep last 1000 events
    if len(processed_events) > 1000:
        # Pop a few items (not efficient but keeps memory in check)
        for _ in range(10):
            try: processed_events.pop()
            except: pass
    return False

router = APIRouter()

# --- 5. WEBHOOK ENDPOINTS ---

@router.get("/test")
@router.get("/feishu/test")
async def test_im_connectivity():
    """v5.6.1: Unified IM & AI Brain Diagnostic"""
    from app.services.config_service import ConfigService
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    config_service = ConfigService(db)
    ai_key = config_service.get_api_key("GOOGLE_API_KEY")
    db.close()
    
    return {
        "version": "v5.6.1-DIAGNOSTIC",
        "timestamp": datetime.now().isoformat(),
        "status": "ok",
        "ai_brain": {
            "google_api_key_set": bool(ai_key),
            "key_prefix": ai_key[:5] if ai_key else "None"
        },
        "platforms": {
            "feishu": bool(settings.FEISHU_APP_ID),
            "telegram": bool(settings.TELEGRAM_BOT_TOKEN),
            "whatsapp": bool(settings.WHATSAPP_API_TOKEN),
            "discord": bool(settings.DISCORD_BOT_TOKEN)
        }
    }

@router.post("/feishu")
@router.post("/feishu/")
async def feishu_webhook(request: Request):
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body)
        if payload.get("type") == "url_verification":
            return JSONResponse(content={"challenge": payload.get("challenge")}, status_code=200)
        
        event_id = payload.get("header", {}).get("event_id")
        if is_duplicate("feishu", event_id): return JSONResponse(content={"status": "dup"}, status_code=200)
        
        event = payload.get("event", {})
        sender_id = event.get("sender", {}).get("sender_id", {}).get("open_id")
        message = event.get("message", {})
        chat_type = message.get("chat_type")
        content_raw = message.get("content", "{}")
        text = json.loads(content_raw).get("text", "").strip()
        
        if sender_id and text:
            asyncio.create_task(generic_brain_process("feishu", sender_id, text, message.get("chat_id"), chat_type, send_feishu_message))
        return JSONResponse(content={"status": "ok"}, status_code=200)
    except: return JSONResponse(content={"status": "err"}, status_code=200)

@router.post("/telegram")
async def telegram_webhook(request: Request):
    """v5.6.0: Telegram Unified Webhook"""
    try:
        payload = await request.json()
        update_id = str(payload.get("update_id"))
        if is_duplicate("telegram", update_id): return {"status": "dup"}
        
        message = payload.get("message", {})
        chat = message.get("chat", {})
        sender_id = str(chat.get("id"))
        text = message.get("text", "")
        if sender_id and text:
            chat_type = "p2p" if chat.get("type") == "private" else "group"
            asyncio.create_task(generic_brain_process("telegram", sender_id, text, sender_id, chat_type, send_telegram_message))
        return {"status": "ok"}
    except: return {"status": "error"}

@router.post("/whatsapp")
@router.get("/whatsapp")
async def whatsapp_webhook(request: Request):
    """v5.6.0: WhatsApp Unified Webhook"""
    params = request.query_params
    if params.get("hub.mode") == "subscribe":
        if params.get("hub.verify_token") == settings.WHATSAPP_VERIFY_TOKEN:
            return PlainTextResponse(params.get("hub.challenge"))
        return PlainTextResponse("Forbidden", status_code=403)
    
    try:
        payload = await request.json()
        # Extract message from Meta's nested payload
        entry = payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [{}])
        
        if not messages: return {"status": "no_msg"}
        
        message = messages[0]
        msg_id = message.get("id")
        if is_duplicate("whatsapp", msg_id): return {"status": "dup"}
        
        sender_id = message.get("from")
        text = message.get("text", {}).get("body", "")
        
        if sender_id and text:
            asyncio.create_task(generic_brain_process("whatsapp", sender_id, text, sender_id, "p2p", send_whatsapp_message))
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"WhatsApp Webhook Error: {str(e)}")
        return {"status": "error"}

@router.post("/discord")
async def discord_webhook(request: Request):
    """v5.6.0: Discord Unified Webhook"""
    try:
        payload = await request.json()
        # Discord Interactions/Webhooks have different types
        if payload.get("type") == 1: # PING
            return JSONResponse({"type": 1})
            
        event_id = payload.get("id") or payload.get("d", {}).get("id")
        if is_duplicate("discord", event_id): return {"status": "dup"}
        
        message = payload.get("message", payload.get("d", {}))
        author = message.get("author", {})
        if author.get("bot"): return {"status": "bot_ignored"}
        
        sender_id = author.get("id")
        text = message.get("content", "")
        channel_id = message.get("channel_id")
        
        if sender_id and text:
            asyncio.create_task(generic_brain_process("discord", sender_id, text, channel_id, "group", send_discord_message))
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Discord Webhook Error: {str(e)}")
        return {"status": "error"}

@router.get("/bind")
async def process_im_binding(
    platform: str = Query(...),
    uid: str = Query(...),
    sig: str = Query(...),
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """v5.5.8: Secure Identity Bridge."""
    if not hmac.compare_digest(sig, generate_binding_sig(platform, uid)):
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    existing = db.query(UserIMBinding).filter_by(platform=platform, platform_uid=uid, is_active=True).first()
    if existing:
        if existing.user_id == current_user.customer_id:
            return {"status": "already_bound", "message": f"Linked to {platform}", "user_name": f"{current_user.first_name}"}
        existing.is_active = False
        db.add(existing)
    
    db.add(UserIMBinding(user_id=current_user.customer_id, platform=platform, platform_uid=uid, is_active=True))
    db.commit()
    return {"status": "success", "message": f"Linked to {platform}!", "user_name": f"{current_user.first_name}"}
