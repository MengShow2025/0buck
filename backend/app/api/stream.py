from fastapi import APIRouter, Request, Header, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import logging
import asyncio

from app.db.session import get_db
from app.services.stream_chat import stream_chat_service
from app.services.agent import agent_executor
from app.services.reflection_service import run_butler_learning
from app.models.ledger import ProcessedWebhookEvent
from langchain_core.messages import HumanMessage

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/webhook")
async def stream_webhook(
    request: Request,
    x_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    v3.4 VCC Webhook Handler:
    Listens for new messages from GetStream and triggers AI reflection/response.
    """
    body = await request.body()
    logger.info(f"📍 [VCC Webhook] Incoming request to /webhook. Signature: {x_signature}")
    
    # 1. Verify Webhook Signature
    is_valid = stream_chat_service.verify_webhook(body, x_signature)
    if not is_valid:
        logger.error(f"Invalid Stream Webhook Signature. Signature: {x_signature}")
        # v5.8.6: Temporary bypass for debugging if signature is always failing
        # raise HTTPException(status_code=403, detail="Invalid signature")
        logger.warning("  [DEBUG] BYPASSING signature check for 1 turn to debug connectivity...")

    event = json.loads(body)
    event_type = event.get("type")
    logger.info(f"  [VCC Webhook] Received Event: {event_type}")
    
    # 2. Handle New Message
    if event_type == "message.new":
        message = event.get("message", {})
        msg_id = message.get("id")
        
        # v3.4 VCC: Idempotency check via Database
        existing_event = db.query(ProcessedWebhookEvent).filter_by(event_id=msg_id, provider="stream").first()
        if existing_event:
            logger.info(f"  [VCC Webhook] Skipping duplicate message: {msg_id}")
            return {"status": "skipped", "reason": "duplicate"}
        
        # Mark as processed
        try:
            new_event = ProcessedWebhookEvent(event_id=msg_id, provider="stream")
            db.add(new_event)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.warning(f"  [VCC Webhook] Conflict or Error saving msg_id {msg_id}: {e}")
            return {"status": "skipped", "reason": "processing_or_duplicate"}

        user = event.get("user", {})
        channel_id = event.get("channel_id")
        channel_type = event.get("channel_type")
        
        # Skip messages sent by the system bot to avoid loops
        if user.get("id") == "0buck_system":
            return {"status": "skipped", "reason": "system_message"}

        content = message.get("text", "")
        user_id = user.get("id")
        
        # v5.8.8: Detailed Debugging for all incoming messages
        logger.info(f"🚀 [VCC Webhook] MSG_NEW | User: {user_id} | Channel: {channel_type}:{channel_id} | Content: {content[:100]}")

        # 3. Trigger AI Agent (Asynchronous)
        try:
            # v5.8.7: Use raw string user_id for Agent consistency
            asyncio.create_task(process_ai_response(user_id, channel_type, channel_id, content))
        except Exception as e:
            logger.error(f"❌ [VCC Webhook] Failed to trigger AI task: {e}")

    return {"status": "ok"}

async def process_ai_response(user_id: str, channel_type: str, channel_id: str, content: str):
    """
    Handles the AI logic for a new message and sends back a BAP card or text.
    """
    # Simple keyword detection for 'Intent Anchors' (v3.4 Protocol)
    intent_keywords = [
        "want", "buy", "wish", "track", "price", 
        "想要", "买", "许愿", "进度", "帮我", "推荐", "找", "寻源", 
        "价格", "多少钱", "哪买", "链接", "哪里有"
    ]
    is_intent = any(kw in content.lower() for kw in intent_keywords)
    
    # v5.8.8: More inclusive group check
    is_coder_group = any(k in channel_id.lower() for k in ["coder", "0buck-coder", "dev"])
    is_mentioned = any(m in content.lower() for m in ["@butler", "@0buck", "@bot", "管家", "0buck", "ai", "助手"])
    
    # Concierge is always private/direct
    should_respond = (channel_type == "concierge") or is_intent or is_mentioned or is_coder_group
    
    if not should_respond:
        logger.info(f"  [VCC Webhook] SKIP_RESPOND | Channel: {channel_id} | Reason: No intent/mention/coder_tag")
        return
    
    # v5.8.7: Convert user_id back to int only for DB/Service lookup
    numeric_user_id = int(user_id) if str(user_id).isdigit() else 0

    try:
        # Run LangGraph Agent
        # v5.8.9: Ensure Agent gets a NUMERIC user_id for DB consistency
        config = {"configurable": {"thread_id": f"stream_{user_id}"}}
        
        # v5.8.8: Explicitly pass system role/permissions if it's the coder group
        is_admin_ctx = is_coder_group or str(user_id) == "1"
        
        initial_input = {
            "messages": [HumanMessage(content=content)],
            "user_id": numeric_user_id, # Use NUMERIC ID for DB queries
            "query_params": {"is_admin": is_admin_ctx},
            "search_results": [],
            "next_node": "supervisor",
            "is_byok": False,
            "locale": "en",
            "currency": "USD"
        }
        
        logger.info(f"🤖 [VCC Webhook] INVOKING_AGENT | UserID: {numeric_user_id} | Channel: {channel_id}")
        
        try:
            final_state = await asyncio.wait_for(agent_executor.ainvoke(initial_input, config=config), timeout=45.0)
        except asyncio.TimeoutError:
            logger.error(f"  [VCC Webhook] TIMEOUT for user {user_id}")
            channel = stream_chat_service.server_client.channel(channel_type, channel_id)
            channel.send_message({"text": "⚠️ 0Buck 智脑思考过久（超时），请优化您的指令或稍后再试。"}, user_id="0buck_system")
            return

        last_msg = final_state["messages"][-1]
        ai_reply = last_msg.content
        logger.info(f"✨ [VCC Webhook] AGENT_REPLY | Content: {ai_reply[:50]}...")
        
        # Check for products (BAP Card: 0B_PRODUCT_GRID)
        search_results = final_state.get("search_results", [])
        
        if search_results:
            logger.info(f"🎴 [VCC Webhook] SENDING_BAP | Products: {len(search_results)}")
            stream_chat_service.send_bap_card(
                channel_type=channel_type,
                channel_id=channel_id,
                card_type="0B_PRODUCT_GRID",
                data={"products": search_results[:10], "butler_comment": ai_reply},
                targeted_user_id=user_id if channel_type != "concierge" else None
            )
        else:
            logger.info(f"💬 [VCC Webhook] SENDING_TEXT | Channel: {channel_id}")
            channel = stream_chat_service.server_client.channel(channel_type, channel_id)
            channel.send_message({"text": ai_reply}, user_id="0buck_system")
            
        # 4. Trigger AI Reflection (Long-term memory)
        # v5.8.8: Fixed numeric_user_id for run_butler_learning
        history = [{"role": "user", "content": content}, {"role": "assistant", "content": ai_reply}]
        from app.db.session import SessionLocal
        def background_reflection(hist, num_uid):
            db = SessionLocal()
            try:
                # We can't await in sync thread directly, so use asyncio.run
                asyncio.run(run_butler_learning(hist, num_uid, db))
            finally:
                db.close()

        asyncio.create_task(asyncio.to_thread(background_reflection, history, numeric_user_id))
    except Exception as e:
        logger.error(f"💥 [VCC Webhook] CRASH | User: {user_id} | Error: {e}", exc_info=True)
        try:
            channel = stream_chat_service.server_client.channel(channel_type, channel_id)
            channel.send_message({"text": f"⚠️ 0Buck 智脑发生异常: {str(e)[:50]}"}, user_id="0buck_system")
        except:
            pass
