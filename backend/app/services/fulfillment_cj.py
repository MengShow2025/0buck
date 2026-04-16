import logging
import json
from sqlalchemy.orm import Session
from app.models.ledger import Order, UserExt
from app.models.product import CandidateProduct
from app.services.cj_service import CJDropshippingService
from decimal import Decimal

logger = logging.getLogger(__name__)

class CJFulfillmentService:
    def __init__(self, db: Session):
        self.db = db
        self.cj_api = CJDropshippingService()

    async def process_shopify_order(self, shopify_payload: dict):
        """
        Main entry point for Step 6 Fulfillment.
        Called from orders/paid webhook.
        """
        shopify_order_id = shopify_payload.get("id")
        order_number = shopify_payload.get("order_number")
        customer = shopify_payload.get("customer", {})
        shipping_address = shopify_payload.get("shipping_address", {})
        line_items = shopify_payload.get("line_items", [])

        if not shipping_address:
            logger.error(f"❌ Order {order_number} has no shipping address.")
            return

        logger.info(f"🚀 Processing fulfillment for Shopify Order #{order_number}")

        from app.models.product import Product
        
        # 1. Map line items to CJ VIDs
        cj_products = []
        order_remarks = []
        
        for item in line_items:
            sku = item.get("sku")
            order_qty = item.get("quantity", 1)
            
            # Lookup product first (published items)
            product = self.db.query(Product).filter(
                (Product.product_id_1688 == sku) | (Product.cj_pid == sku)
            ).first()
            
            # Lookup candidate product fallback
            candidate = None
            if not product:
                candidate = self.db.query(CandidateProduct).filter(
                    (CandidateProduct.source_url.contains(sku)) | 
                    (CandidateProduct.product_id_1688 == sku) |
                    (CandidateProduct.cj_pid == sku)
                ).first()

            if not product and not candidate:
                logger.warning(f"⚠️ SKU {sku} not found in Truth Engine database. Skipping.")
                continue
            
            # Use found entity
            entity = product or candidate
            
            # v7.0 Truth Engine: Capture Packing Instructions & Remarks
            struct = entity.structural_data or {}
            if struct.get("packing_instruction"):
                order_remarks.append(f"Packing: {struct.get('packing_instruction')}")
            
            # Priority 1 - Expert-injected default_vid in structural_data
            vid = struct.get("default_vid")
            multiplier = struct.get("order_quantity", 1)
            
            # Priority 2 - System-locked VID in variants_raw
            if not vid and hasattr(entity, 'variants_raw') and entity.variants_raw and isinstance(entity.variants_raw, dict):
                vid = entity.variants_raw.get("vid")
            
            # Priority 3 - Product model cj_pid/variant mapping (v7.0)
            if not vid and hasattr(entity, 'variants_data') and entity.variants_data:
                # If variants_data is a list, find matching SKU or use first
                if isinstance(entity.variants_data, list) and len(entity.variants_data) > 0:
                    vid = entity.variants_data[0].get("vid")
                
            if vid:
                logger.info(f"   ✅ Using Expert Locked VID {vid} for {sku}")
                cj_products.append({
                    "vid": vid,
                    "quantity": int(order_qty * multiplier),
                    "unitPrice": float(getattr(entity, 'cost_cny', getattr(entity, 'original_price', 0)) or 0)
                })
                continue

            # Fallback: Fetch PID and use first variant
            pid = getattr(entity, 'product_id_1688', getattr(entity, 'cj_pid', None))
            if not pid:
                continue
            
            detail = await self.cj_api.get_product_detail(pid)
            if not detail or not detail.get("variants"):
                logger.error(f"❌ CJ PID {pid} detail not found.")
                continue
            
            # Use the first variant for now (v6.2.0 limitation)
            variant = detail["variants"][0]
            vid = variant["vid"]
            sell_price = float(variant.get("variantSellPrice") or variant.get("sellPrice") or 0)
            cj_products.append({
                "vid": vid,
                "quantity": quantity,
                "unitPrice": sell_price
            })

        if not cj_products:
            logger.error(f"❌ No valid CJ products found for Order #{order_number}")
            return

        # 2. Get Logistics Method
        # Default to 'CN' to 'US' if not specified
        dest_country_code = shipping_address.get("country_code", "US")
        logistics = await self.cj_api.get_freight_calculate(
            products=[{"vid": p["vid"], "quantity": p["quantity"]} for p in cj_products],
            end_country=dest_country_code,
            zip_code=shipping_address.get("zip")
        )

        if not logistics:
            logger.error(f"❌ No logistics available for Order #{order_number} to {dest_country_code}")
            return

        # Pick the first available (usually cheapest/recommended)
        logistic_name = logistics[0].get("logisticName", "CJ Packet Sensitive")

        # 3. Create CJ Order
        cj_order_data = {
            "orderNumber": str(order_number),
            "shippingZip": shipping_address.get("zip"),
            "shippingCountryCode": dest_country_code,
            "shippingCountry": shipping_address.get("country"),
            "shippingProvince": shipping_address.get("province"),
            "shippingCity": shipping_address.get("city"),
            "shippingCustomerName": f"{shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}",
            "shippingAddress": shipping_address.get("address1"),
            "shippingAddress2": shipping_address.get("address2"),
            "shippingPhone": shipping_address.get("phone") or customer.get("phone"),
            "email": customer.get("email"),
            "logisticName": logistic_name,
            "fromCountryCode": "CN",
            "products": cj_products,
            "remark": " | ".join(list(set(order_remarks))) if order_remarks else None
        }

        logger.info(f"📦 Creating CJ Order for #{order_number}...")
        res = await self.cj_api.create_order(cj_order_data)
        
        if res.get("success"):
            cj_order_id = res["data"][0]["cjOrderId"]
            logger.info(f"✅ CJ Order Created Successfully: {cj_order_id}")
            
            # 4. Optional: Automatic Payment (Step 6 "Pure" automation)
            # await self.cj_api.add_to_cart([cj_order_id])
            # pay_res = await self.cj_api.pay_order(shipment_order_id, pay_id)
            
            return {
                "status": "success",
                "cj_order_id": cj_order_id,
                "logistic_name": logistic_name
            }
        else:
            logger.error(f"❌ CJ Order Creation Failed: {res.get('message')}")
            return {"status": "error", "message": res.get("message")}
