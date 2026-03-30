from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.services.rewards import RewardsService
import hmac
import hashlib
import json
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
    # if not verify_shopify_webhook(data, x_shopify_hmac_sha256):
    #    raise HTTPException(status_code=401, detail="Invalid HMAC")
    
    payload = json.loads(data)
    customer_id = payload.get("customer", {}).get("id")
    order_id = payload.get("id")
    
    print(f"Webhook Received: Order Paid {order_id} for customer {customer_id}")
    
    # Logic: Initialize Rewards/Checkin Plan for the order
    # rewards_service = RewardsService(db)
    # rewards_service.init_checkin_plan(customer_id, order_id, Decimal(payload.get("total_price")))
    
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
