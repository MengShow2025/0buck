import string
import random
from app.db.session import get_db, SessionLocal
from app.models.butler import UserIMBinding, BindingCode
from app.models.ledger import PromoShareLink
from app.services.agent import run_agent
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.celery_app import celery_app
import json
import httpx
import asyncio
import logging
import hashlib
import hmac
import re
from datetime import datetime
from typing import Any, Optional
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from app.gateway.feishu_crypto import maybe_decrypt_feishu_payload
from app.gateway.bind_tokens import generate_bind_token, verify_bind_token
from app.gateway.feishu_oauth import build_feishu_authorize_url
from app.gateway.dedup import is_duplicate_event
from app.services.promo_cards import (
    create_share_link,
    build_card_payload,
    resolve_share_link,
    build_template_variants,
    render_template_message,
)

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
    v5.7.36: Verification Code-based Binding & Unbinding
    Handles Guest Mode, Identity Bridge, and AI Processing.
    """
    db = SessionLocal()
    try:
        lang = detect_language(text)
        # v5.7.21: Robust Identity Logic
        binding = db.query(UserIMBinding).filter_by(platform=platform, platform_uid=platform_uid, is_active=True).first()
        is_guest = binding is None
        user_id = binding.user_id if binding else None
        
        logger.info(f"🧠 [{platform.upper()}] Identity: UID={platform_uid}, UserID={user_id}, IsGuest={is_guest}")
        
        # v5.7.36: Handle Unbind command
        if text.strip().lower() in ["解绑", "unbind", "logout"]:
            if binding:
                db.delete(binding)
                db.commit()
                msg = "您的账号已成功解绑。" if lang == "zh" else "Your account has been successfully unbound."
            else:
                msg = "您当前未绑定任何账号。" if lang == "zh" else "You are not currently bound to any account."
            await send_rich_message(platform, platform_uid, msg, "0Buck AI Brain", None, lang)
            return

        if is_guest:
            # v5.7.38: 1. Greet and ask to bind first. 2. If they type 'bind'/'绑定', generate and send the code.
            user_input = text.strip().lower()
            parts = user_input.split()
            if len(parts) == 2 and parts[0] in ["bind", "绑定"]:
                payload = verify_bind_token(parts[1], expected_platform=platform, secret=settings.SECRET_KEY)
                if payload:
                    existing = db.query(UserIMBinding).filter_by(platform=platform, platform_uid=platform_uid).first()
                    if existing:
                        existing.user_id = int(payload["user_id"])
                        existing.is_active = True
                        db.add(existing)
                    else:
                        db.add(UserIMBinding(user_id=int(payload["user_id"]), platform=platform, platform_uid=platform_uid, is_active=True))
                    db.commit()
                    msg = "✅ 绑定成功！您现在可以直接使用完整服务。" if lang == "zh" else "✅ Binding successful! Full service is now available."
                    await send_rich_message(platform, platform_uid, msg, "0Buck AI Brain", None, lang)
                    return

            if user_input in ["绑定", "bind", "login", "登录"]:
                # Generate or retrieve 6-digit alphanumeric code
                from datetime import timedelta
                now = datetime.now()
                existing_code = db.query(BindingCode).filter(
                    BindingCode.platform == platform,
                    BindingCode.platform_uid == platform_uid,
                    BindingCode.expires_at > now
                ).first()
                
                if existing_code:
                    code_str = existing_code.code
                else:
                    code_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    new_code = BindingCode(
                        code=code_str,
                        platform=platform,
                        platform_uid=platform_uid,
                        expires_at=now + timedelta(minutes=10)
                    )
                    db.add(new_code)
                    db.commit()
                    
                # Format to make it easy to copy
                msg = f"请复制以下绑定码，并在 0Buck 网页版 AI 聊天框中发送以完成验证：\n\n{code_str}\n\n(该验证码 10 分钟内有效)" if lang == "zh" else f"Please copy the following code and send it in the 0Buck Web AI Chat to complete verification:\n\n{code_str}\n\n(Valid for 10 minutes)"
            else:
                # First time greeting / unhandled guest message
                msg = "👋 欢迎来到 0Buck AI 管家！\n\n为了给您提供专属的个性化服务、记住您的偏好，并支持在聊天中查询订单和物流等高级功能，我们需要先绑定您的 0Buck 账号。\n\n👉 **请回复「绑定」获取验证码**" if lang == "zh" else "👋 Welcome to 0Buck AI Butler!\n\nTo provide you with personalized service, remember your preferences, and support advanced features like order/shipping queries in chat, we need to link your 0Buck account.\n\n👉 **Please reply 'bind' to get a verification code**"

            await send_rich_message(platform, platform_uid, msg, "0Buck AI Brain", None, lang)
            return
        
        # Composite Session for Persona Projection
        session_id = f"{platform}_{chat_id}_{platform_uid}" if chat_type == "group" else f"{platform}_{platform_uid}"
        
        # 1. Send Immediate Thinking Status (Minimal Rotating Icon)
        thinking_msg = "🌀"
        
        # v5.6.5: Thinking status shouldn't have a login link yet (too early)
        await send_rich_message(platform, platform_uid, thinking_msg, "0Buck AI Brain", None, lang)
        
        # 2. Call AI Brain
        try:
            ai_response = await run_agent(content=text, user_id=int(user_id), session_id=session_id)
            main_reply = ai_response.get("content")
            if not main_reply or main_reply.strip() == "":
                main_reply = "AI Brain is currently resting..." if lang == "en" else "0Buck 智脑暂时没有想好如何回复，请稍后再试。"
        except Exception as ai_err:
            logger.error(f"AI Agent Error: {ai_err}")
            err_str = str(ai_err).lower()
            if "user location is not supported" in err_str or "failedprecondition" in err_str:
                main_reply = "⚠️ 抱歉，当前网络环境/IP 地区被大模型提供商（Google Gemini）限制访问。请尝试开启全局代理或更换节点后重试。" if lang == "zh" else "⚠️ Sorry, the current network environment/IP region is restricted by the AI provider (Google Gemini). Please try using a global proxy or switching nodes."
            elif "quota" in err_str or "429" in err_str:
                main_reply = "⚠️ 0Buck 智脑额度已耗尽。请联系系统管理员充值或在个人设置中配置您自己的大模型 Key。" if lang == "zh" else "⚠️ 0Buck AI Brain quota exhausted. Please contact admin or configure your own API Key."
            elif "api key" in err_str or "api_key" in err_str:
                main_reply = "⚠️ 0Buck 智脑连接异常 (API Key 无效或未配置)。请联系系统管理员或在个人设置中配置您自己的大模型 Key。" if lang == "zh" else "⚠️ 0Buck AI Brain connection error (Invalid API Key). Please contact admin or configure your own API Key."
            elif "minimax" in err_str or "minimax" in settings.GEMINI_API_KEY.lower():
                main_reply = f"⚠️ 0Buck 智脑遇到了服务商的连接问题: {str(ai_err)}" if lang == "zh" else f"⚠️ 0Buck AI Brain encountered a provider connection issue: {str(ai_err)}"
            else:
                main_reply = f"⚠️ 0Buck 智脑暂时无法响应: {str(ai_err)}" if lang == "zh" else f"⚠️ 0Buck AI Brain error: {str(ai_err)}"
        
        # 3. Send final response
        # v5.7.36: bind_url is no longer used, pass None
        await send_rich_message(platform, platform_uid, main_reply, "0Buck AI Brain", None, lang)
        logger.info(f"✅ [{platform.upper()}] Response complete for {platform_uid}")
        
    except Exception as e:
        logger.error(f"❌ [{platform.upper()}] Brain Process Error: {str(e)}")
    finally:
        db.close()


def _enqueue_brain_process(platform: str, platform_uid: str, text: str, chat_id: str, chat_type: str):
    if settings.CELERY_ENABLED:
        try:
            # P0 Fix: Enqueue to Celery for reliable background processing
            celery_app.send_task("im_brain_process", args=[platform, platform_uid, text, chat_id, chat_type])
            return
        except Exception as e:
            logger.warning(f"  [IM Webhook] Celery enqueue failed, falling back to asyncio: {e}")

    # Fallback to in-memory asyncio task if Celery is not available
    if platform == "feishu":
        asyncio.create_task(generic_brain_process(platform, platform_uid, text, chat_id, chat_type, send_feishu_message))
    elif platform == "telegram":
        asyncio.create_task(generic_brain_process(platform, platform_uid, text, chat_id, chat_type, send_telegram_message))
    elif platform == "whatsapp":
        asyncio.create_task(generic_brain_process(platform, platform_uid, text, chat_id, chat_type, send_whatsapp_message))
    elif platform == "discord":
        asyncio.create_task(generic_brain_process(platform, platform_uid, text, chat_id, chat_type, send_discord_message))
    else:
        asyncio.create_task(generic_brain_process(platform, platform_uid, text, chat_id, chat_type, send_whatsapp_message))

# --- 3. PLATFORM ADAPTERS ---

# --- FEISHU (LARK) ---
async def get_feishu_tenant_access_token():
    app_id = settings.FEISHU_APP_ID.strip().replace("`", "") if settings.FEISHU_APP_ID else ""
    app_secret = settings.FEISHU_APP_SECRET.strip().replace("`", "") if settings.FEISHU_APP_SECRET else ""
    if not app_id or not app_secret:
        logger.error("Feishu token request skipped: FEISHU_APP_ID/FEISHU_APP_SECRET not configured.")
        return None
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(url, json={"app_id": app_id, "app_secret": app_secret})
            res.raise_for_status()
            payload = res.json()
            if payload.get("code", 0) != 0:
                logger.error("Feishu token request failed: code=%s msg=%s", payload.get("code"), payload.get("msg"))
                return None
            return payload.get("tenant_access_token")
        except Exception as e:
            logger.exception("Feishu token request exception: %s", str(e))
            return None

async def send_feishu_message(receive_id: str, content: str):
    token = await get_feishu_tenant_access_token()
    if not token:
        return
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"}
    payload = {"receive_id": receive_id, "msg_type": "text", "content": json.dumps({"text": content})}
    async with httpx.AsyncClient() as client:
        res = await client.post(url, json=payload, headers=headers)
        res.raise_for_status()
        result = res.json()
        if result.get("code", 0) != 0:
            raise RuntimeError(f"Feishu send text failed: code={result.get('code')} msg={result.get('msg')}")

async def send_feishu_rich_link(receive_id: str, text: str, title: str, link_url: Optional[str] = None, lang: str = "en"):
    """v5.7.14: Send Feishu Rich Text Message with language-adaptive links."""
    token = await get_feishu_tenant_access_token()
    if not token:
        return
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
        res = await client.post(url, json=payload, headers=headers)
        res.raise_for_status()
        result = res.json()
        if result.get("code", 0) != 0:
            raise RuntimeError(f"Feishu send rich message failed: code={result.get('code')} msg={result.get('msg')}")

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
    ai_key = config_service.get_api_key("MINIMAX_API_KEY") or config_service.get_api_key("GEMINI_API_KEY") or config_service.get_api_key("GOOGLE_API_KEY")
    db.close()
    
    return {
        "version": "v5.6.1-DIAGNOSTIC",
        "timestamp": datetime.now().isoformat(),
        "status": "ok",
        "ai_brain": {
            "api_key_set": bool(ai_key),
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
async def feishu_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body)
        payload = maybe_decrypt_feishu_payload(payload, settings.FEISHU_ENCRYPT_KEY)
        if payload.get("type") == "url_verification":
            return JSONResponse(content={"challenge": payload.get("challenge")}, status_code=200)
        
        event_id = payload.get("header", {}).get("event_id")
        if event_id and is_duplicate_event(db, "feishu", str(event_id)):
            return JSONResponse(content={"status": "dup"}, status_code=200)
        
        event = payload.get("event", {})
        sender_id = event.get("sender", {}).get("sender_id", {}).get("open_id")
        message = event.get("message", {})
        chat_type = message.get("chat_type")
        content_raw = message.get("content", "{}")
        text = json.loads(content_raw).get("text", "").strip()
        
        if sender_id and text:
            _enqueue_brain_process("feishu", sender_id, text, message.get("chat_id"), chat_type)
        return JSONResponse(content={"status": "ok"}, status_code=200)
    except Exception as e:
        logger.exception("Feishu webhook error: %s", str(e))
        return JSONResponse(content={"status": "err"}, status_code=200)

@router.post("/telegram")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """v5.6.0: Telegram Unified Webhook"""
    try:
        payload = await request.json()
        update_id = str(payload.get("update_id"))
        if update_id and is_duplicate_event(db, "telegram", update_id):
            return {"status": "dup"}
        
        message = payload.get("message", {})
        chat = message.get("chat", {})
        sender_id = str(chat.get("id"))
        text = message.get("text", "")
        if sender_id and text:
            chat_type = "p2p" if chat.get("type") == "private" else "group"
            _enqueue_brain_process("telegram", sender_id, text, sender_id, chat_type)
        return {"status": "ok"}
    except Exception as e:
        logger.exception("Telegram webhook error: %s", str(e))
        return {"status": "error"}

@router.post("/whatsapp")
@router.get("/whatsapp")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
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
        if msg_id and is_duplicate_event(db, "whatsapp", str(msg_id)):
            return {"status": "dup"}
        
        sender_id = message.get("from")
        text = message.get("text", {}).get("body", "")
        
        if sender_id and text:
            _enqueue_brain_process("whatsapp", sender_id, text, sender_id, "p2p")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"WhatsApp Webhook Error: {str(e)}")
        return {"status": "error"}

@router.post("/discord")
async def discord_webhook(request: Request, db: Session = Depends(get_db)):
    """v5.6.0: Discord Unified Webhook"""
    try:
        payload = await request.json()
        # Discord Interactions/Webhooks have different types
        if payload.get("type") == 1: # PING
            return JSONResponse({"type": 1})
            
        event_id = payload.get("id") or payload.get("d", {}).get("id")
        if event_id and is_duplicate_event(db, "discord", str(event_id)):
            return {"status": "dup"}
        
        message = payload.get("message", payload.get("d", {}))
        author = message.get("author", {})
        if author.get("bot"): return {"status": "bot_ignored"}
        
        sender_id = author.get("id")
        text = message.get("content", "")
        channel_id = message.get("channel_id")
        
        if sender_id and text:
            _enqueue_brain_process("discord", sender_id, text, channel_id, "group")
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
    logger.info(f"🔗 BINDING REQUEST: platform={platform}, uid={uid}, sig={sig}, user_id={current_user.customer_id}")
    
    if not hmac.compare_digest(sig, generate_binding_sig(platform, uid)):
        logger.error(f"❌ BINDING SIG MISMATCH: expected={generate_binding_sig(platform, uid)}, received={sig}")
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    # v5.7.18: Robust binding with Upsert logic to handle unique constraint
    try:
        existing = db.query(UserIMBinding).filter_by(platform=platform, platform_uid=uid).first()
        if existing:
            logger.info(f"🔄 UPDATING EXISTING BINDING: id={existing.id}")
            existing.user_id = current_user.customer_id
            existing.is_active = True
            db.add(existing)
        else:
            logger.info(f"🆕 CREATING NEW BINDING")
            db.add(UserIMBinding(user_id=current_user.customer_id, platform=platform, platform_uid=uid, is_active=True))
        
        db.commit()
        logger.info(f"✅ BINDING SUCCESSFUL for User {current_user.customer_id}")
        return {"status": "success", "message": f"Linked to {platform}!", "user_name": f"{current_user.first_name}"}
    except Exception as e:
        logger.error(f"❌ BINDING DB ERROR: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error during binding")


@router.post("/bind-token")
async def create_bind_token(
    platform: str = Query(...),
    ttl_seconds: int = Query(600),
    current_user: Any = Depends(get_current_user),
):
    if platform not in ["feishu", "telegram", "whatsapp", "discord"]:
        raise HTTPException(status_code=400, detail="Unsupported platform")
    token = generate_bind_token(
        user_id=int(current_user.customer_id),
        platform=platform,
        secret=settings.SECRET_KEY,
        ttl_seconds=ttl_seconds,
    )
    return {
        "status": "success",
        "platform": platform,
        "token": token,
        "expires_in": ttl_seconds,
        "im_command": f"bind {token}",
    }


@router.get("/bindings")
async def get_bindings_status(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    platforms = ["feishu", "whatsapp", "telegram", "discord"]
    rows = db.query(UserIMBinding).filter_by(user_id=current_user.customer_id, is_active=True).all()
    linked_map = {r.platform: r.platform_uid for r in rows}
    bindings = []
    for p in platforms:
        uid = linked_map.get(p)
        bindings.append({
            "platform": p,
            "linked": bool(uid),
            "platform_uid": uid or "",
        })
    return {"status": "success", "bindings": bindings}


@router.delete("/bindings/{platform}")
async def unlink_platform_binding(
    platform: str,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if platform not in ["feishu", "whatsapp", "telegram", "discord"]:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    rows = db.query(UserIMBinding).filter_by(
        user_id=current_user.customer_id,
        platform=platform,
        is_active=True,
    ).all()
    for row in rows:
        row.is_active = False
        db.add(row)
    db.commit()
    return {"status": "success", "platform": platform, "unlinked_count": len(rows)}


@router.post("/promo/cards/generate")
async def generate_promo_card(
    payload: dict,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card_type = str(payload.get("card_type", "invite"))
    target_type = str(payload.get("target_type", "none"))
    target_id = payload.get("target_id")
    platform = payload.get("platform")
    entry_type = payload.get("entry_type")
    share_category = str(payload.get("share_category") or ("fan_source" if card_type == "invite" else "distribution"))
    policy_version = str(payload.get("policy_version", "v1"))
    source_code = payload.get("source_code")

    if card_type not in {"product", "merchant", "invite"}:
        raise HTTPException(status_code=400, detail="Invalid card_type")
    if share_category not in {"group_buy", "distribution", "fan_source"}:
        raise HTTPException(status_code=400, detail="Invalid share_category")
    if card_type in {"product", "merchant"} and not target_id:
        raise HTTPException(status_code=400, detail="target_id is required for product/merchant card")

    row = create_share_link(
        db=db,
        sharer_user_id=int(current_user.customer_id),
        share_category=share_category,
        card_type=card_type,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        platform=platform,
        entry_type=entry_type,
        policy_version=policy_version,
        source_code=source_code,
    )

    domain = settings.STOREFRONT_DOMAIN.strip().rstrip("/")
    base_url = f"https://{domain}" if domain and not domain.startswith("http") else domain
    if not base_url:
        raise HTTPException(status_code=500, detail="STOREFRONT_DOMAIN not configured")
    universal_link = f"{base_url}/api/v1/im/promo/links/{row.share_token}"
    try:
        card = build_card_payload(db, card_type, target_type, str(target_id) if target_id is not None else None, universal_link)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    templates = build_template_variants(card)

    return {
        "status": "success",
        "share_token": row.share_token,
        "share_category": share_category,
        "card_type": card_type,
        "card": card,
        "templates": templates,
        "universal_link": universal_link,
    }


@router.post("/promo/cards/send")
async def send_promo_card(
    payload: dict,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    share_token = str(payload.get("share_token", ""))
    platform = str(payload.get("platform", ""))
    destination_uid = payload.get("destination_uid")
    if not share_token or platform not in {"feishu", "telegram", "whatsapp", "discord"}:
        raise HTTPException(status_code=400, detail="Invalid request")

    row = resolve_share_link(db, share_token)
    if not row or int(row.sharer_user_id) != int(current_user.customer_id):
        raise HTTPException(status_code=404, detail="share_link_not_found")

    domain = settings.STOREFRONT_DOMAIN.strip().rstrip("/")
    base_url = f"https://{domain}" if domain and not domain.startswith("http") else domain
    if not base_url:
        raise HTTPException(status_code=500, detail="STOREFRONT_DOMAIN not configured")
    universal_link = f"{base_url}/api/v1/im/promo/links/{row.share_token}"
    card = build_card_payload(db, row.card_type, row.target_type, row.target_id, universal_link)
    templates = build_template_variants(card)
    template_id = str(payload.get("template_id", "style_minimal"))
    selected = next((x for x in templates if x["template_id"] == template_id), templates[0])
    text = render_template_message(selected)

    if not destination_uid:
        # fallback to sender's own binding uid
        own_binding = db.query(UserIMBinding).filter_by(user_id=current_user.customer_id, platform=platform, is_active=True).first()
        if not own_binding:
            raise HTTPException(status_code=400, detail="No linked account for this platform")
        destination_uid = own_binding.platform_uid

    await send_rich_message(platform, str(destination_uid), text, card["title"], card["link"], lang="zh")
    return {"status": "success", "platform": platform, "destination_uid": str(destination_uid)}


@router.get("/promo/links/{share_token}")
async def resolve_promo_link(share_token: str, db: Session = Depends(get_db)):
    row = resolve_share_link(db, share_token)
    if not row:
        raise HTTPException(status_code=404, detail="invalid_or_expired_share_link")
    return {
        "status": "success",
        "share_token": row.share_token,
        "share_category": row.share_category,
        "card_type": row.card_type,
        "target_type": row.target_type,
        "target_id": row.target_id,
        "sharer_user_id": row.sharer_user_id,
        "policy_version": row.policy_version,
    }


@router.post("/promo/cards/from-link")
async def promo_cards_from_link(payload: dict, db: Session = Depends(get_db)):
    link = str(payload.get("link", "")).strip()
    matched = re.search(r"/api/v1/im/promo/links/([^/?#]+)", link)
    if not matched:
        raise HTTPException(status_code=400, detail="invalid_promo_link")
    share_token = matched.group(1)
    row = resolve_share_link(db, share_token)
    if not row:
        raise HTTPException(status_code=404, detail="invalid_or_expired_share_link")

    domain = settings.STOREFRONT_DOMAIN.strip().rstrip("/")
    base_url = f"https://{domain}" if domain and not domain.startswith("http") else domain
    if not base_url:
        raise HTTPException(status_code=500, detail="STOREFRONT_DOMAIN not configured")
    universal_link = f"{base_url}/api/v1/im/promo/links/{row.share_token}"

    card = build_card_payload(db, row.card_type, row.target_type, row.target_id, universal_link)
    templates = build_template_variants(card)
    return {
        "status": "success",
        "share_token": row.share_token,
        "templates": templates,
        "parsed": {
            "card_type": row.card_type,
            "share_category": row.share_category,
            "target_type": row.target_type,
            "target_id": row.target_id,
        },
    }


@router.get("/promo/cards/my-fixed-invite")
async def my_fixed_invite_cards(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(PromoShareLink)
        .filter_by(
            sharer_user_id=int(current_user.customer_id),
            card_type="invite",
            share_category="fan_source",
            entry_type="fixed_invite",
            status="active",
        )
        .order_by(PromoShareLink.created_at.desc())
        .first()
    )
    if not row:
        row = create_share_link(
            db=db,
            sharer_user_id=int(current_user.customer_id),
            share_category="fan_source",
            card_type="invite",
            target_type="none",
            target_id=None,
            platform=None,
            entry_type="fixed_invite",
            policy_version="v1",
        )

    domain = settings.STOREFRONT_DOMAIN.strip().rstrip("/")
    base_url = f"https://{domain}" if domain and not domain.startswith("http") else domain
    if not base_url:
        raise HTTPException(status_code=500, detail="STOREFRONT_DOMAIN not configured")
    universal_link = f"{base_url}/api/v1/im/promo/links/{row.share_token}"
    card = build_card_payload(db, "invite", "none", None, universal_link)
    templates = build_template_variants(card)
    return {"status": "success", "share_token": row.share_token, "templates": templates}


@router.get("/feishu/oauth/start")
async def feishu_oauth_start(
    current_user: Any = Depends(get_current_user),
):
    """
    Direct binding flow entry:
    web-side click bind -> show authorize_url as QR/link -> user authorizes in Feishu.
    """
    domain = settings.STOREFRONT_DOMAIN.strip().rstrip("/")
    base_url = f"https://{domain}" if domain and not domain.startswith("http") else domain
    if not base_url:
        raise HTTPException(status_code=500, detail="STOREFRONT_DOMAIN not configured")

    redirect_uri = f"{base_url}/api/v1/im/feishu/oauth/callback"
    state = generate_bind_token(
        user_id=int(current_user.customer_id),
        platform="feishu_oauth",
        secret=settings.SECRET_KEY,
        ttl_seconds=600,
    )
    authorize_url = build_feishu_authorize_url(
        client_id=settings.FEISHU_APP_ID,
        redirect_uri=redirect_uri,
        state=state,
        scope="auth:user.id:read",
    )
    return {
        "status": "success",
        "platform": "feishu",
        "authorize_url": authorize_url,
        "expires_in": 600,
    }


@router.get("/feishu/oauth/callback")
async def feishu_oauth_callback(code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)):
    """
    OAuth callback endpoint that auto-binds Feishu open_id to current web user in state token.
    """
    payload = verify_bind_token(state, expected_platform="feishu_oauth", secret=settings.SECRET_KEY)
    if not payload:
        raise HTTPException(status_code=403, detail="Invalid or expired state")

    domain = settings.STOREFRONT_DOMAIN.strip().rstrip("/")
    base_url = f"https://{domain}" if domain and not domain.startswith("http") else domain
    redirect_uri = f"{base_url}/api/v1/im/feishu/oauth/callback" if base_url else ""

    token_url = "https://open.feishu.cn/open-apis/authen/v2/oauth/token"
    user_info_url = "https://open.feishu.cn/open-apis/authen/v1/user_info"
    async with httpx.AsyncClient(timeout=12) as client:
        token_resp = await client.post(
            token_url,
            json={
                "grant_type": "authorization_code",
                "client_id": settings.FEISHU_APP_ID,
                "client_secret": settings.FEISHU_APP_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail=f"Feishu token exchange failed: {token_data}")

        me_resp = await client.get(
            user_info_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        me_data = me_resp.json()
        open_id = me_data.get("data", {}).get("open_id") or me_data.get("open_id")
        if not open_id:
            raise HTTPException(status_code=400, detail=f"Feishu user info failed: {me_data}")

    user_id = int(payload["user_id"])
    existing = db.query(UserIMBinding).filter_by(platform="feishu", platform_uid=open_id).first()
    if existing:
        existing.user_id = user_id
        existing.is_active = True
        db.add(existing)
    else:
        db.add(UserIMBinding(user_id=user_id, platform="feishu", platform_uid=open_id, is_active=True))
    db.commit()

    return JSONResponse(content={
        "status": "success",
        "message": "Feishu account linked successfully.",
        "platform": "feishu",
        "platform_uid": open_id,
        "user_id": user_id,
    })
