import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.db.session import get_db
from app.models.product import Product
from app.services.personalized_matrix_service import PersonalizedMatrixService
from app.schemas.products import DiscoveryResponse, ProductItem
from app.services.cj_service import CJDropshippingService
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

class ShippingRequest(BaseModel):
    product_id: int
    country_code: str = "US"
    zip_code: Optional[str] = None

@router.post("/calculate-shipping")
async def calculate_shipping(req: ShippingRequest, db: Session = Depends(get_db)):
    """
    v8.0 Truth Logistics: Calculates the exact freight fee based on zip code.
    """
    # 1. Get product for CJ mapping
    p = db.query(Product).filter(Product.id == req.product_id).first()
    if not p or not p.cj_pid:
        # Fallback to standard rate if product not mapped to CJ
        return {"freight": 9.99, "method": "Standard Shipping", "days": "10-15"}
        
    try:
        cj = CJDropshippingService()
        # For simplicity, we assume we want the first variant if multiple exist
        # Or we use the p.variant_sku if it contains the CJ VID
        vid = p.variant_sku if p.variant_sku and len(p.variant_sku) > 5 else None
        
        info = await cj.calculate_shipping_and_tax(
            pid=p.cj_pid, 
            vid=vid, 
            country_code=req.country_code, 
            zip_code=req.zip_code
        )
        return info
    except Exception as e:
        logger.error(f"Shipping calculation failed: {e}")
        return {"freight": 9.99, "method": "Standard Shipping", "days": "10-15"}

@router.get("/discovery", response_model=DiscoveryResponse)
async def get_discovery_matrix(
    user_id: Optional[int] = None, 
    user_country: str = "US",
    mode: str = "local",
    db: Session = Depends(get_db)
):
    """
    v8.0 Vortex Predictive Discovery: Returns 2x5 matrix with Geofencing.
    """
    try:
        service = PersonalizedMatrixService(db)
        # Use default ID 1 for guests to avoid error
        result = await service.get_personalized_discovery(user_id or 1, user_country=user_country, mode=mode)
        return result
    except Exception as e:
        logger.error(f"Discovery Matrix Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{product_id}", response_model=ProductItem)
async def get_product_detail(product_id: int, db: Session = Depends(get_db)):
    """
    Fetch single product detail for v8.0 app.
    """
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
        
    imgs = p.images
    if isinstance(imgs, str):
        try: imgs = json.loads(imgs)
        except: imgs = []
    
    return {
        "id": p.id,
        "title": p.title_en or p.title_zh or "Unknown Product",
        "price": float(p.sale_price),
        "image": imgs[0] if imgs else None,
        "description": p.body_html or p.description_en or "",
        "warehouse_anchor": p.warehouse_anchor or "CN",
        "product_category_label": p.product_category_label or "NORMAL",
        "handle": p.shopify_product_handle
    }
