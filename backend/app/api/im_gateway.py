import os
from app.db.session import get_db, SessionLocal
from app.models.butler import UserIMBinding, BindingCode
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
import random
from datetime import datetime, timedelta
from typing import Any, Optional, List, Dict
from fastapi import APIRouter, Request, Depends, HTTPException, Query, Body
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
    """v5.7.38: Language-adaptive Rich Message Dispatcher with Button support."""
    if platform == "feishu":
        await send_feishu_rich_link(uid, text, title, link_url, lang)
    elif platform == "telegram":
        # v5.7.38: Telegram Inline Button for actions
        msg = f"*{title}*\n\n{text}"
        buttons = None
        
        if link_url:
            if link_url.startswith("action://"):
                btn_text = "✨ 点击获取同步指令" if lang == "zh" else "✨ Get Sync Code"
                buttons = [{"text": btn_text, "callback_data": "get_sync_code"}]
            else:
                btn_text = "🔗 点击登录" if lang == "zh" else "🔗 Login"
                buttons = [{"text": btn_text, "url": link_url}]
                
        await send_telegram_message(uid, msg, buttons)
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

async def handle_binding_command(platform: str, uid: str, lang: str = "en") -> str:
    """v5.7.35: Generate a 6-digit code for reverse binding."""
    db = SessionLocal()
    try:
        # Generate 6-digit code
        code = str(random.randint(100000, 999999))
        expires_at = datetime.now() + timedelta(minutes=15)
        
        # Store in DB
        db.merge(BindingCode(
            code=code,
            platform=platform,
            platform_uid=uid,
            expires_at=expires_at
        ))
        db.commit()
        
        # v5.7.52: Restored pre-fill link but with root path '/' to avoid 404.
        # Instruction emphasizes MANUAL send to respect user preference.
        import urllib.parse
        cmd_text = f"我要绑定账号 {code}" if lang == "zh" else f"Link my account {code}"
        encoded_cmd = urllib.parse.quote(cmd_text)
        deep_link = f"https://0buck.com/?prefill={encoded_cmd}"
        
        if lang == "zh":
            return f"✨ 0Buck 身份同步指令 ✨\n\n1️⃣ 复制发送下面这句话给 App 里的 AI 管家：\n\n{cmd_text}\n\n2️⃣ 或者点击下方链接自动填入指令，然后手动点击发送：\n{deep_link}\n\n(验证码 15 分钟内有效)"
        else:
            return f"✨ 0Buck Identity Sync ✨\n\n1️⃣ Copy and send the following to the App's AI Butler:\n\n{cmd_text}\n\n2️⃣ Or click below to pre-fill the command, then click send manually:\n{deep_link}\n\n(Valid for 15 minutes)"
    except Exception as e:
        logger.error(f"Error generating binding code: {e}")
        return "Failed to generate binding code. Please try again later."
    finally:
        db.close()

async def generic_brain_process(platform: str, platform_uid: str, text: str, chat_id: str, chat_type: str, send_func):
    """
    v5.7.50: Robust Brain Proxy with Full Binding Lifecycle (Bind/Unbind).
    """
    db = SessionLocal()
    try:
        lang = detect_language(text)
        
        # 1. Check for Binding Command
        binding_keywords = ["bind", "绑定", "/bind", "会员号"]
        if any(kw in text.lower() for kw in binding_keywords):
            reply = await handle_binding_command(platform, platform_uid, lang)
            await send_func(platform_uid, reply)
            return

        # 2. Check for Unbinding Command (v5.7.50)
        unbinding_keywords = ["unbind", "解绑", "/unbind"]
        if any(kw in text.lower() for kw in unbinding_keywords):
            try:
                binding = db.query(UserIMBinding).filter_by(platform=platform, platform_uid=platform_uid).first()
                if binding:
                    binding.is_active = False
                    db.commit()
                    reply = "✨ 已为您解除账号关联。您现在已回归访客身份。" if lang == "zh" else "✨ Unlinked successfully. You are now in guest mode."
                else:
                    reply = "⚠️ 您当前尚未绑定任何账号。" if lang == "zh" else "⚠️ You are not currently linked."
                await send_func(platform_uid, reply)
                return
            except Exception as unbind_err:
                logger.error(f"Unbinding Error: {unbind_err}")
                await send_func(platform_uid, "Error during unbinding.")
                return

        # 3. Regular AI Process
        binding = db.query(UserIMBinding).filter_by(platform=platform, platform_uid=platform_uid, is_active=True).first()
        is_guest = binding is None
        user_id = binding.user_id if binding else 1
        
        # Composite Session for Persona Projection
        session_id = f"{platform}_{chat_id}_{platform_uid}" if chat_type == "group" else f"{platform}_{platform_uid}"
        
        # 1. Call AI Brain
        try:
            ai_response = await run_agent(content=text, user_id=user_id, session_id=session_id)
            main_reply = ai_response.get("content")
            if not main_reply or main_reply.strip() == "":
                main_reply = "AI Brain is currently resting..." if lang == "en" else "0Buck 智脑暂时没有想好如何回复，请稍后再试。"
        except Exception as ai_err:
            logger.error(f"AI Agent Error: {ai_err}")
            main_reply = f"⚠️ 0Buck 智脑暂时无法响应: {str(ai_err)}" if lang == "zh" else f"⚠️ 0Buck AI Brain error: {str(ai_err)}"
        
        # 2. Handle Guest Hint (v5.7.44: Simply append instructions to the reply)
        if is_guest:
            hint = "\n\n---\n✨ 提示：检测到您尚未绑定。回复“绑定”即可获取同步指令，关联您的 0Buck 账户。" if lang == "zh" else "\n\n---\n✨ Tip: You are not linked. Reply 'bind' to sync your 0Buck account."
            main_reply += hint

        # 3. Send final response
        await send_func(platform_uid, main_reply)
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
    """v5.7.38: Send Feishu Interactive Card with support for Buttons and Links."""
    token = await get_feishu_tenant_access_token()
    if not token: return
    url = "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"}
    
    # 1. Determine if this is an Action Button or a Browser Link
    is_action = link_url and link_url.startswith("action://")
    
    # Language-aware labels
    btn_text = "✨ 点击获取同步指令" if lang == "zh" else "✨ Get Sync Code"
    link_text = "🔗 点击登录获得完整服务" if lang == "zh" else "🔗 Login for Full Service"
    
    # 2. Construct Interactive Card (Message Card)
    # v5.7.38: Using 'interactive' type for better UX
    card_config = {
        "header": {
            "title": {
                "tag": "plain_text",
                "content": title
            },
            "template": "blue"
        },
        "elements": [
            {
                "tag": "div",
                "text": {
                    "tag": "lark_md",
                    "content": text
                }
            }
        ]
    }
    
    if link_url:
        if is_action:
            # Add an Interactive Button
            card_config["elements"].append({
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {
                            "tag": "plain_text",
                            "content": btn_text
                        },
                        "type": "primary",
                        "value": {
                            "command": "get_sync_code"
                        }
                    }
                ]
            })
        else:
            # Add a Standard Link Button
            card_config["elements"].append({
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {
                            "tag": "plain_text",
                            "content": link_text
                        },
                        "type": "default",
                        "url": link_url
                    }
                ]
            })

    payload = {
        "receive_id": receive_id,
        "msg_type": "interactive",
        "content": json.dumps(card_config)
    }
    
    async with httpx.AsyncClient() as client:
        await client.post(url, json=payload, headers=headers)

# --- TELEGRAM ---
async def send_telegram_message(chat_id: str, content: str, buttons: Optional[List[Dict[str, str]]] = None):
    """v5.7.38: Telegram Send Adapter with Inline Keyboard support."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token: return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    
    payload = {
        "chat_id": chat_id, 
        "text": content, 
        "parse_mode": "Markdown"
    }
    
    if buttons:
        payload["reply_markup"] = {
            "inline_keyboard": [buttons]
        }
        
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
    """v5.7.42: Unified IM & AI Brain Diagnostic with updated version tracking."""
    from app.services.config_service import ConfigService
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    config_service = ConfigService(db)
    ai_key = config_service.get_api_key("GOOGLE_API_KEY")
    db.close()
    
    return {
        "version": "v5.7.51-STABLE",
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
    """v5.7.44: Simplified Feishu Webhook. Only handles regular messages."""
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body)
        
        # 1. URL Verification
        if payload.get("type") == "url_verification":
            return JSONResponse(content={"challenge": payload.get("challenge")}, status_code=200)
        
        # 2. Handle Regular Events
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
    except Exception as e:
        logger.error(f"Feishu Webhook Error: {e}")
        return JSONResponse(content={"status": "err"}, status_code=200)

@router.post("/telegram")
@router.post("/telegram/")
async def telegram_webhook(request: Request):
    """v5.7.44: Simplified Telegram Webhook."""
    try:
        payload = await request.json()
        
        # Handle Regular Messages
        message = payload.get("message", {})
        sender_id = str(message.get("from", {}).get("id", ""))
        text = message.get("text", "")
        
        if sender_id and text:
            asyncio.create_task(generic_brain_process("telegram", sender_id, text, str(message.get("message_id")), "private", send_telegram_message))
        return JSONResponse(content={"status": "ok"}, status_code=200)
    except Exception as e:
        logger.error(f"Telegram Webhook Error: {e}")
        return JSONResponse(content={"status": "err"}, status_code=200)

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

@router.post("/claim")
async def claim_binding_code(
    code: str = Body(..., embed=True),
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """v5.7.35: Claim a 6-digit code to link IM account."""
    logger.info(f"🔑 CLAIM REQUEST: code={code}, user_id={current_user.customer_id}")
    
    # 1. Look up code
    pending = db.query(BindingCode).filter_by(code=code).first()
    
    if not pending:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    
    if pending.expires_at < datetime.now():
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=400, detail="Code has expired")
    
    # 2. Perform Binding
    try:
        existing = db.query(UserIMBinding).filter_by(platform=pending.platform, platform_uid=pending.platform_uid).first()
        if existing:
            existing.user_id = current_user.customer_id
            existing.is_active = True
            db.add(existing)
        else:
            db.add(UserIMBinding(
                user_id=current_user.customer_id, 
                platform=pending.platform, 
                platform_uid=pending.platform_uid, 
                is_active=True
            ))
        
        # 3. Cleanup code
        db.delete(pending)
        db.commit()
        
        logger.info(f"✅ REVERSE BINDING SUCCESSFUL: {pending.platform} linked to User {current_user.customer_id}")
        return {"status": "success", "message": f"Successfully linked to your {pending.platform} account!"}
    except Exception as e:
        logger.error(f"❌ CLAIM ERROR: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error during claiming")
