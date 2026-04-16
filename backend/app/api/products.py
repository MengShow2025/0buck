from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.db.session import get_db
from app.services.personalized_matrix_service import PersonalizedMatrixService
from app.schemas.products import DiscoveryResponse, ProductDetailResponse
from app.models import Product
from app.models.product import CandidateProduct
from app.services.cj_normalize import extract_cj_images, first_image, extract_cj_dimensions, extract_cj_weights, format_dimensions_cm, format_weight_g
from app.api.deps import get_current_user
from app.models.ledger import UserExt
from app.core.checkout_block_reason import (
    CHECKOUT_BLOCK_REASON_INACTIVE,
    CHECKOUT_BLOCK_REASON_MISSING_PRICE,
    CHECKOUT_BLOCK_REASON_NOT_PUBLISHED,
)

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
import json

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/discovery", response_model=DiscoveryResponse)
async def get_discovery_matrix(
    user_country: Optional[str] = "US",
    db: Session = Depends(get_db),
    current_user: UserExt = Depends(get_current_user),
):
    """
    v8.0 Truth Protocol: Warehouse-Aware Discovery Matrix.
    """
    try:
        service = PersonalizedMatrixService(db)
        result = await service.get_personalized_discovery(int(current_user.customer_id), user_country=user_country)
        return result
    except Exception as e:
        logger.error(f"Discovery Matrix Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product_detail(product_id: int, db: Session = Depends(get_db)):
    try:
        product = None
        try:
            product = db.query(Product).filter(Product.id == product_id).first()
        except SQLAlchemyError as e:
            db.rollback()
            logger.warning("Product table query skipped due to schema mismatch: %s", str(e))
        if product:
            image_url = ""
            if product.images and isinstance(product.images, list) and len(product.images) > 0:
                image_url = product.images[0]

            title = product.title_en or product.title_zh or "Unknown Product"
            price = float(product.sale_price or 0.0)
            checkout_ready = bool(product.is_active and (product.sale_price or 0) > 0)
            checkout_block_reason = None if checkout_ready else (
                CHECKOUT_BLOCK_REASON_INACTIVE if not product.is_active else CHECKOUT_BLOCK_REASON_MISSING_PRICE
            )

            return {
                "id": product.id,
                "title": title,
                "checkout_ready": checkout_ready,
                "checkout_block_reason": checkout_block_reason,
                "price": price,
                "original_price": float(product.original_price or product.sale_price or 0.0),
                "image": image_url,
                "supplier": "0Buck Verified",
                "category": product.category or "General",
                "attributes": product.attributes or {},
                "structural_data": product.structural_data or {},
                "optimized_content": {},
                "mirror_assets": product.detail_images or product.images or [],
                "warehouse_anchor": getattr(product, 'warehouse_anchor', "CN"),
                "inventory": getattr(product, 'inventory', 0),
            }

        candidate = db.query(CandidateProduct).filter(CandidateProduct.id == product_id).first()
        if candidate:
            cand_images = candidate.images if isinstance(candidate.images, list) else []
            image_url = cand_images[0] if cand_images else ""
            supplier_info = candidate.supplier_info if isinstance(candidate.supplier_info, dict) else {}
            supplier_name = supplier_info.get("name") or candidate.supplier_id_1688 or "0Buck Candidate"
            price = float(candidate.estimated_sale_price or candidate.comp_price_usd or 0.0)
            original_price = float(candidate.comp_price_usd or candidate.estimated_sale_price or price or 0.0)
            title = (
                candidate.title_en_preview
                or candidate.title_zh
                or candidate.title_en_preview
                or f"Candidate #{candidate.id}"
            )
            return {
                "id": candidate.id,
                "title": title,
                "checkout_ready": False,
                "checkout_block_reason": CHECKOUT_BLOCK_REASON_NOT_PUBLISHED,
                "price": price,
                "original_price": original_price,
                "image": image_url,
                "supplier": supplier_name,
                "category": candidate.category or "General",
                "attributes": candidate.attributes or {},
                "structural_data": {
                    "source_platform": candidate.source_platform,
                    "source_url": candidate.source_url,
                    "market_url": candidate.market_comparison_url,
                    "amazon_price": candidate.amazon_price,
                    "ebay_price": candidate.ebay_price,
                    "status": candidate.status,
                },
                "optimized_content": {
                    "desire_hook": candidate.desire_hook,
                    "desire_logic": candidate.desire_logic,
                    "desire_closing": candidate.desire_closing,
                },
                "mirror_assets": cand_images,
            }

        try:
            row = db.execute(
                text(
                    """
                    SELECT id, cj_pid, raw_json, title_en, source_url,
                           market_url, market_price, market_compare_at_price,
                           freight_fee, inventory_total, vendor_rating, shipping_days
                    FROM cj_raw_products
                    WHERE id = :id
                    """
                ),
                {"id": product_id},
            ).mappings().first()
        except SQLAlchemyError:
            # Some deployments don't contain cj_raw_products; keep API behavior graceful.
            row = None

        if not row:
            raise HTTPException(status_code=404, detail="Product not found")

        raw = row.get("raw_json") or {}
        if isinstance(raw, str):
            try:
                raw = json.loads(raw)
            except Exception:
                raw = {}

        title = row.get("title_en") or raw.get("title") or raw.get("productName") or raw.get("name") or "CJ Product"
        supplier_name = raw.get("supplierName") or raw.get("vendorName") or raw.get("storeName") or "CJ"

        images = extract_cj_images(raw)
        image_url = first_image(images)

        dims = format_dimensions_cm(extract_cj_dimensions(raw))
        packing_w, product_w = extract_cj_weights(raw)
        weight = format_weight_g(packing_w, product_w)

        price = 0.0
        for key in ("sale_price", "price", "sellPrice", "productPrice", "sellPriceUsd"):
            v = raw.get(key)
            if v is not None:
                try:
                    price = float(v)
                    break
                except Exception:
                    pass

        structural = {
            "cj_pid": row.get("cj_pid"),
            "source_url": row.get("source_url"),
            "market_url": row.get("market_url"),
            "market_price": row.get("market_price"),
            "market_compare_at_price": row.get("market_compare_at_price"),
            "freight_fee": row.get("freight_fee"),
            "inventory_total": row.get("inventory_total"),
            "vendor_rating": row.get("vendor_rating"),
            "shipping_days": row.get("shipping_days"),
            "dimensions": dims,
            "weight": weight,
        }

        return {
            "id": int(row.get("id")),
            "title": title,
            "checkout_ready": False,
            "checkout_block_reason": CHECKOUT_BLOCK_REASON_NOT_PUBLISHED,
            "price": price,
            "original_price": price,
            "image": image_url,
            "supplier": supplier_name,
            "category": "General",
            "attributes": {},
            "structural_data": structural,
            "optimized_content": {},
            "mirror_assets": images or ([image_url] if image_url else []),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Product detail error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
