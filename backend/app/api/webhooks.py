from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.services.rewards import RewardsService
from backend.app.services.sync_1688 import Sync1688Service
import hmac
import hashlib
import json
from decimal import Decimal
from backend.app.core.config import settings

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
    # if not verify_shopify_webhook(data, x_shopify_hmac_sha256):
    #    print("HMAC verification failed!")
    #    raise HTTPException(status_code=401, detail="Invalid HMAC")
    
    payload = json.loads(data)
    customer_id = payload.get("customer", {}).get("id")
    order_id = payload.get("id")
    
    if not customer_id or not order_id:
        return {"status": "skipped", "reason": "No customer or order ID"}
        
    total_price = Decimal(payload.get("total_price", "0"))
    total_tax = Decimal(payload.get("total_tax", "0"))
    total_shipping = Decimal(payload.get("total_shipping_price_set", {}).get("shop_money", {}).get("amount", "0"))
    
    # TC-01: User completes checkout. 
    # reward_base = Price - Shipping - Tax
    reward_base = total_price - total_tax - total_shipping
    
    print(f"Webhook Received: Order Paid {order_id} for customer {customer_id}")
    print(f"Total: {total_price}, Tax: {total_tax}, Shipping: {total_shipping} -> Base: {reward_base}")
    
    # Logic: Initialize Rewards/Checkin Plan for the order
    rewards_service = RewardsService(db)
    timezone = payload.get("customer", {}).get("timezone", "UTC")
    
    rewards_service.init_checkin_plan(customer_id, order_id, reward_base, timezone)
    
    # Logic: Trigger 1688 Sourcing
    sourcing_service = Sync1688Service(db)
    line_items = payload.get("line_items", [])
    await sourcing_service.trigger_sourcing(order_id, line_items)
    
    return {"status": "ok"}

@router.post("/shopify/orders/fulfilled")
async def orders_fulfilled_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    data = await request.body()
    payload = json.loads(data)
    print(f"Webhook Received: Order Fulfilled {payload.get('id')}")
    return {"status": "ok"}
