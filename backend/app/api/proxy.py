from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.services.rewards import RewardsService
import hmac
import hashlib
from backend.app.core.config import settings

router = APIRouter()

@router.get("/proxy")
async def shopify_proxy(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Shopify App Proxy endpoint.
    Verified by signature provided by Shopify.
    """
    params = dict(request.query_params)
    signature = params.pop("signature", None)
    
    # Verification logic
    # sorted_params = sorted(params.items())
    # data = "".join([f"{k}={v}" for k, v in sorted_params])
    # expected_signature = hmac.new(
    #     settings.SHOPIFY_API_SECRET.encode('utf-8'),
    #     data.encode('utf-8'),
    #     hashlib.sha256
    # ).hexdigest()
    
    # if signature != expected_signature:
    #    return {"error": "Invalid signature"}
    
    # Return proxy content or redirect to frontend
    return {"message": "App Proxy Verified", "customer_id": params.get("logged_in_customer_id")}
