from fastapi import APIRouter, Request, Header, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.rewards import RewardsService
from app.services.supply_chain import SupplyChainService
from app.services.agent import run_agent
from app.services.whatsapp import send_whatsapp_message
from app.models.ledger import SystemConfig, Order, ProcessedWebhookEvent, WebhookEvent
from app.workers.shopify_tasks import process_shopify_webhook
import hmac
import hashlib
import json
import logging
import uuid
from decimal import Decimal
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

def verify_shopify_webhook(data: bytes, hmac_header: str):
    digest = hmac.new(
        settings.SHOPIFY_API_SECRET.encode('utf-8'),
        data,
        digestmod=hashlib.sha256
    ).digest()
    import base64
    computed_hmac = base64.b64encode(digest).decode('utf-8')
    return hmac.compare_digest(computed_hmac, hmac_header)

@router.post("/shopify/products/created")
async def products_created_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_shopify_hmac_sha256: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    v5.2: Listen for products created by DSers/Miaoshou and trigger 0Buck Brain.
    1. Capture new Shopify Product metadata.
    2. Pull associated Hotspot/Amazon/eBay comparison data from local Candidate Pool.
    3. Run Desire Engine and Price Engine.
    4. Push Back (PUT) the enriched data to Shopify.
    """
    data = await request.body()
    if not verify_shopify_webhook(data, x_shopify_hmac_sha256):
        if settings.ENVIRONMENT == "production":
            raise HTTPException(status_code=401, detail="Unauthorized")

    payload = json.loads(data)
    shopify_id = payload.get("id")
    title = payload.get("title")
    vendor = payload.get("vendor") # Usually 1688/Alibaba supplier name from DSers/Miaoshou
    
    logger.info(f"🚩 Webhook: Shopify Product Created -> {title} (ID: {shopify_id}) from Vendor: {vendor}")

    # Initialize Sync Service
    from app.services.sync_shopify import SyncShopifyService
    sync_service = SyncShopifyService()
    
    # Process enrichment in background to keep webhook response fast
    background_tasks.add_task(sync_service.enrich_from_shopify, payload, db)
    
    return {"status": "ok", "message": "Product enrichment queued"}

@router.post("/shopify/orders/paid")
async def orders_paid_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_shopify_hmac_sha256: str = Header(None),
    x_shopify_topic: str = Header(None),
    x_shopify_message_id: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    v4.0: Robust Order Paid Webhook.
    1. Immediate 200 response.
    2. Queue raw payload for background processing.
    """
    data = await request.body()
    
    # 1. Verification
    if not verify_shopify_webhook(data, x_shopify_hmac_sha256):
        logger.error(f"🚨 Webhook HMAC verification failed for order {x_shopify_message_id}")
        if settings.ENVIRONMENT == "production":
            raise HTTPException(status_code=401, detail="Unauthorized")
    
    # 2. Idempotency Check (Immediate)
    if x_shopify_message_id:
        existing = db.query(ProcessedWebhookEvent).filter_by(event_id=x_shopify_message_id, provider="shopify").first()
        if existing:
            return {"status": "duplicate", "message": "Order already processed"}

    # 3. Queue Payload (Step 2 of Task 1)
    try:
        payload = json.loads(data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    new_event = WebhookEvent(
        id=uuid.uuid4(),
        event_id=x_shopify_message_id or str(payload.get("id")),
        topic=x_shopify_topic or "orders/paid",
        provider="shopify",
        payload=payload,
        status="pending"
    )
    db.add(new_event)
    db.commit()
    
    # Trigger Asynchronous processing (Step 3 of Task 1)
    try:
        process_shopify_webhook.delay(str(new_event.id))
    except Exception as e:
        logger.warning(f"⚠️ Celery delay failed, using background_tasks: {str(e)}")
        background_tasks.add_task(process_shopify_webhook, str(new_event.id))

    return {"status": "ok", "event_id": str(new_event.id)}

@router.post("/shopify/orders/fulfilled")
async def orders_fulfilled_webhook(
    request: Request,
    x_shopify_hmac_sha256: str = Header(None),
    db: Session = Depends(get_db)
):
    data = await request.body()
    # v3.7.5: Enforce HMAC for fulfillment
    if not verify_shopify_webhook(data, x_shopify_hmac_sha256):
       if settings.ENVIRONMENT == "production":
           raise HTTPException(status_code=401, detail="Unauthorized")
    
    payload = json.loads(data)
    order_id = payload.get("id")
    print(f"Webhook Received: Order Fulfilled {order_id}")
    
    # Extract fulfillment tracking info
    fulfillments = payload.get("fulfillments", [])
    tracking_number = None
    if fulfillments:
        tracking_number = fulfillments[0].get("tracking_number")
    
    # Update local order status
    order = db.query(Order).filter_by(shopify_order_id=order_id).first()
    if order:
        order.fulfillment_status = "fulfilled"
        order.tracking_number = tracking_number
        order.status = "shipped"
        db.commit()
        
        # Notify via WhatsApp
        # We need to find the user's phone. 
        # For simplicity in this logic, we use the customer data from the webhook or DB.
        customer = payload.get("customer") or {}
        phone = customer.get("phone")
        if not phone:
            # Fallback to DB
            user = db.query(UserExt).filter_by(customer_id=order.user_id).first()
            # If we had a UserExt phone, we'd use it here.
            # Assuming we can get it or use the one from the payload.
            pass
            
        if phone:
            msg = f"🚚 Good news! Your 0Buck order #{order.order_number} has been shipped. Tracking: {tracking_number}"
            await send_whatsapp_message(phone, msg)
            
    return {"status": "ok"}

@router.post("/shopify/orders/refunded")
async def orders_refunded_webhook(
    request: Request,
    x_shopify_hmac_sha256: str = Header(None),
    db: Session = Depends(get_db)
):
    data = await request.body()
    # v3.7.5: Enforce HMAC for refunds
    if not verify_shopify_webhook(data, x_shopify_hmac_sha256):
       if settings.ENVIRONMENT == "production":
           raise HTTPException(status_code=401, detail="Unauthorized")

    payload = json.loads(data)
    order_id = payload.get("id")
    print(f"Webhook Received: Order Refunded {order_id}")
    
    # 1. Update local order status
    order = db.query(Order).filter_by(shopify_order_id=order_id).first()
    if order:
        order.status = "refunded"
        db.commit()
        
    # 2. Trigger Full Clawback of rewards
    # v3.5.0: System ID 1 for automated webhooks
    rewards_service = RewardsService(db, current_user_id=1)
    clawback_res = rewards_service.clawback_rewards_for_order(order_id)
    print(f"Clawback processed for Order {order_id}: {clawback_res}")
    
    return {"status": "ok", "clawback": clawback_res}

# --- WhatsApp Cloud API Webhooks ---

@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    request: Request
):
    """
    Verification endpoint for Meta's Webhook configuration.
    Expects hub.mode, hub.verify_token, and hub.challenge in params.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")
    
    if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
        print("WhatsApp webhook verified!")
        from fastapi.responses import Response
        return Response(content=challenge, media_type="text/plain")
    else:
        raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receives incoming WhatsApp messages, sends them to the AI agent,
    and returns the agent's response back to WhatsApp.
    """
    data = await request.body()
    payload = json.loads(data)
    
    # Meta's payload structure is deeply nested
    try:
        entry = payload.get("entry", [])[0]
        change = entry.get("changes", [])[0]
        value = change.get("value", {})
        message_data = value.get("messages", [])[0]
        
        msg_id = message_data.get("id")
        # Idempotency Check
        if msg_id:
            existing = db.query(ProcessedWebhookEvent).filter_by(event_id=msg_id, provider="whatsapp").first()
            if existing:
                print(f"Skipping duplicate WhatsApp message: {msg_id}")
                return {"status": "skipped", "reason": "duplicate"}
            
            # Record it
            try:
                new_event = ProcessedWebhookEvent(event_id=msg_id, provider="whatsapp")
                db.add(new_event)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Conflict recording WhatsApp event {msg_id}: {e}")
                return {"status": "skipped", "reason": "conflict"}

        sender_id = message_data.get("from") # User's WhatsApp ID
        message_text = message_data.get("text", {}).get("body", "")
        
        if message_text:
            print(f"WhatsApp Message from {sender_id}: {message_text}")
            
            # Step 1: Send to AI Agent
            # Use sender_id as thread_id for conversation persistence
            ai_response = await run_agent(message_text, session_id=f"whatsapp_{sender_id}")
            
            # Step 2: Extract text response
            reply_text = ai_response.get("content", "Sorry, I couldn't process that.")
            
            # Step 3: Send back to WhatsApp
            await send_whatsapp_message(sender_id, reply_text)
            
    except Exception as e:
        print(f"Error processing WhatsApp message: {str(e)}")
        # We return 200 to acknowledge receipt to Meta, even on error
    
    return {"status": "ok"}
