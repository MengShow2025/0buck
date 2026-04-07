from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.butler import UserIMBinding
from app.services.agent import run_agent
from app.core.config import settings
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/feishu")
async def test_feishu_endpoint():
    return {"status": "Feishu Webhook Endpoint is Reachable"}

@router.post("/feishu")
async def feishu_webhook(request: Request):
    """
    v5.5.2: Unified IM Gateway - Feishu (Lark) Adapter.
    Handles message reception, identity mapping, and AI Brain routing.
    """
    try:
        data = await request.body()
        if not data:
            return {"status": "empty_body"}
            
        payload = json.loads(data)
        logger.info(f"📩 Received Feishu Payload: {payload.get('type') or 'event'}")
        
        # 1. Handle Feishu URL Verification (Fast Path - No DB needed)
        if payload.get("type") == "url_verification":
            challenge = payload.get("challenge")
            logger.info(f"✅ Responding to Feishu Challenge: {challenge}")
            return {"challenge": challenge}
        
        # 2. Extract Message Info
        event = payload.get("event", {})
        sender = event.get("sender", {})
        sender_id = sender.get("sender_id", {}).get("open_id")
        message = event.get("message", {})
        
        # Feishu content is a stringified JSON
        try:
            content_obj = json.loads(message.get("content", "{}"))
            text_content = content_obj.get("text", "")
        except:
            text_content = ""
        
        if not sender_id or not text_content:
            return {"status": "ignored"}

        # 3. Identity Mapping (Lazy DB session for better performance)
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            binding = db.query(UserIMBinding).filter_by(platform="feishu", platform_uid=sender_id, is_active=True).first()
            
            if not binding:
                # v5.5: Default to User 1 for demo if unbound
                user_id = 1 
                logger.warning(f"⚠️ Unbound Feishu User {sender_id}. Defaulting to User 1.")
            else:
                user_id = binding.user_id

            # 4. Route to AI Brain (LangGraph)
            ai_response = await run_agent(
                content=text_content, 
                user_id=user_id,
                session_id=f"feishu_{sender_id}"
            )
            
            # 5. Return Response (Simplified for now)
            return {
                "msg_type": "text",
                "content": {
                    "text": ai_response.get("content", "AI Brain is processing...")
                }
            }
        finally:
            db.close()
    except Exception as e:
        logger.error(f"❌ Feishu Webhook Error: {str(e)}")
        return {"status": "error", "detail": str(e)}

@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, db: Session = Depends(get_db)):
    """v5.5: Unified IM Gateway - WhatsApp Adapter (Refactored)"""
    # ... logic similar to Feishu but using WhatsApp Cloud API format ...
    return {"status": "ok"}
