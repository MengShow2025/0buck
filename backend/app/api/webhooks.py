from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.rewards import RewardsService
from app.services.supply_chain import SupplyChainService
from app.services.agent import run_agent
from app.services.whatsapp import send_whatsapp_message
from app.models.ledger import SystemConfig, Order, ProcessedWebhookEvent
from app.models.product import Product
import hmac
import hashlib
import json
from decimal import Decimal
from app.core.config import settings

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

@router.post("/shopify/orders/paid")
async def orders_paid_webhook(
    request: Request,
    x_shopify_hmac_sha256: str = Header(None),
    db: Session = Depends(get_db)
):
    data = await request.body()
    # During dev/tunnel testing, we might skip HMAC if it fails due to ngrok or other issues
    if not verify_shopify_webhook(data, x_shopify_hmac_sha256):
       print("HMAC verification failed!")
       raise HTTPException(status_code=401, detail="Invalid HMAC")
    
    payload = json.loads(data)
    customer = payload.get("customer") or {}
    customer_id = customer.get("id")
    order_id = payload.get("id")
    order_number = payload.get("name") or str(order_id)
    currency = payload.get("currency") or "USD"
    total_price = payload.get("current_total_price") or payload.get("total_price") or "0"
    
    if not customer_id or not order_id:
        print(f"Webhook Skipped: customer_id={customer_id}, order_id={order_id}")
        return {"status": "skipped", "reason": "No customer or order ID"}
        
    line_items = payload.get("line_items", [])
    
    # NEW RULE: Exclude specific categories from Reward Base
    excluded_config = db.query(SystemConfig).filter_by(key="excluded_reward_categories").first()
    excluded_categories = set(excluded_config.value) if excluded_config and excluded_config.value else set()
    
    total_eligible_price = Decimal('0.0')
    for item in line_items:
        variant_id = str(item.get("variant_id"))
        quantity = item.get("quantity", 1)
        price = Decimal(str(item.get("price", "0")))
        
        # Look up product in our DB to check category
        product = db.query(Product).filter(Product.shopify_variant_id == variant_id).first()
        
        # If not found by variant, try by SKU (if SKU contains the variant info)
        if not product and item.get("sku"):
             # Assuming SKU format is like 1688-XXXX
             parts = item.get("sku").split("-")
             if len(parts) > 1:
                product = db.query(Product).filter(Product.product_id_1688 == parts[-1]).first()

        is_excluded = False
        if product:
            if product.category in excluded_categories:
                is_excluded = True
                print(f"  Item Excluded (Category: {product.category}): {item.get('title')}")
            elif not product.is_reward_eligible:
                is_excluded = True
                print(f"  Item Excluded (Eligibility=False): {item.get('title')}")
        
        if not is_excluded:
            total_eligible_price += price * Decimal(str(quantity))

    # For the reward base, we use the sum of eligible items.
    # Note: Shipping and Tax are generally not rewarded.
    reward_base = total_eligible_price

    # Persist local Order cache (used by automated refund idempotency)
    try:
        local_order = db.query(Order).filter_by(shopify_order_id=order_id).first()
        if not local_order:
            local_order = Order(
                shopify_order_id=order_id,
                user_id=customer_id,
                order_number=order_number,
                total_price=Decimal(str(total_price)),
                currency=currency,
                status="paid",
                refund_status="none",
            )
            db.add(local_order)
        else:
            local_order.user_id = customer_id
            local_order.order_number = order_number
            local_order.currency = currency
            if local_order.total_price is None or local_order.total_price == 0:
                local_order.total_price = Decimal(str(total_price))
        db.commit()
    except Exception as e:
        print(f"Failed to upsert local order cache: {e}")
    
    print(f"Webhook Received: Order Paid {order_id} for customer {customer_id}")
    print(f"Total Eligible Base: {reward_base} (Excluded Categories: {list(excluded_categories)})")
    
    # Create Local Order Cache
    existing_order = db.query(Order).filter_by(shopify_order_id=order_id).first()
    if not existing_order:
        new_order = Order(
            shopify_order_id=order_id,
            user_id=customer_id,
            order_number=payload.get("name"),
            total_price=Decimal(str(payload.get("total_price", "0"))),
            currency=payload.get("currency", "USD"),
            status="paid"
        )
        db.add(new_order)
        db.commit()
    
    # Logic: Initialize Rewards/Checkin Plan for the order
    # v3.5.0: System ID 1 for automated webhooks
    rewards_service = RewardsService(db, current_user_id=1)
    timezone = customer.get("timezone", "UTC")
    
    if reward_base > 0:
        rewards_service.init_checkin_plan(customer_id, order_id, reward_base, timezone)
    else:
        print(f"  Order #{order_id} has 0 eligible reward base. Skipping check-in plan initialization.")
    
    # TC-03: Process Referral/KOL Commissions
    # We look for 'referral_code' in note_attributes
    note_attributes = payload.get("note_attributes", [])
    referral_code = next((attr.get("value") for attr in note_attributes if attr.get("name") == "referral_code"), None)
    
    if referral_code:
        print(f"Referral Code Detected: {referral_code}")
        rewards_service.record_referral(customer_id, referral_code)
        rewards_service.process_referral_commissions(customer_id, order_id, reward_base, referral_code)
    
    # v3.4: Multi-channel Social Automation
    from app.services.social_automation import SocialAutomationService
    social_service = SocialAutomationService(db)
    await social_service.notify_order_paid(order_id)
    
    # Logic: Trigger Supply Chain Sourcing
    sourcing_service = SupplyChainService(db)
    line_items = payload.get("line_items", [])
    
    # v3.0: Tiered Fulfillment Logic
    # 1. <$30: Auto-fulfill (Shadow Account)
    # 2. >$30: Manual Approval (Admin Queue)
    auto_limit = float(rewards_service.config_service.get("AUTO_FULFILLMENT_LIMIT", 30.0))
    is_auto = Decimal(str(total_price)) < Decimal(str(auto_limit))
    
    await sourcing_service.trigger_sourcing(order_id, line_items, auto_fulfill=is_auto)
    
    # Logic: Send WhatsApp Notification to customer
    shipping_address = payload.get("shipping_address") or {}
    customer_phone = customer.get("phone") or shipping_address.get("phone")
    if customer_phone:
        msg = f"🎉 Order #{payload.get('name')} Paid! Your 500-day check-in reward path has started. Check it here: {settings.BACKEND_URL}/checkin"
        await send_whatsapp_message(customer_phone, msg)
        print(f"WhatsApp notification sent to {customer_phone}")
    
    return {"status": "ok"}

@router.post("/shopify/orders/fulfilled")
async def orders_fulfilled_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    data = await request.body()
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
    db: Session = Depends(get_db)
):
    data = await request.body()
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
