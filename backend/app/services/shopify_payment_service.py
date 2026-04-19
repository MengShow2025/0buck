import shopify
import logging
import json
from decimal import Decimal
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.core.http_client import ResilientSyncClient
from app.models.product import Product
from app.models.ledger import Order as LocalOrder

logger = logging.getLogger(__name__)

class ShopifyDraftOrderService:
    """
    v3.5.0: Secure Draft Order Service (Schema B & C).
    Implements the Price Firewall and Wallet Balance Integration.
    """
    def __init__(self):
        self.shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
        self.access_token = settings.SHOPIFY_ACCESS_TOKEN
        self.api_version = "2024-01"
        self.session = shopify.Session(self.shop_url, self.api_version, self.access_token)
        shopify.ShopifyResource.activate_session(self.session)

    def get_or_create_shopify_customer(self, user_id: int, email: str, referral_code: Optional[str] = None) -> int:
        """
        v3.6.0: Zero-ID Mapping. Synchronizes 0Buck user with Shopify Customer.
        """
        customers = shopify.Customer.search(query=f"email:{email}")
        if customers:
            customer = customers[0]
        else:
            customer = shopify.Customer()
            customer.email = email
            # Sync initial data
            customer.first_name = "0Buck"
            customer.last_name = f"User_{user_id}"
        
        # Sync Tags (Critical for LTV Tracking in Shopify Admin)
        raw_tags = getattr(customer, "tags", "") or ""
        if isinstance(raw_tags, str):
            tags = [t.strip() for t in raw_tags.split(",") if t.strip()]
        else:
            tags = []
        
        tags.append("0buck_verified")
        if referral_code:
            tags.append(f"ref_{referral_code}")
        
        customer.tags = ",".join(list(set(tags)))
        customer.save()
        return customer.id

    def create_draft_order(
        self, 
        customer_id: int, 
        items: List[Dict[str, Any]], 
        balance_to_use: Decimal = Decimal("0.0"),
        referral_code: Optional[str] = None,
        email: Optional[str] = None,
        extra_discount: Decimal = Decimal("0.0"),
    ) -> Dict[str, Any]:
        """
        Schema B: Create a Draft Order with balance deduction.
        v3.6.0: Integrated with Zero-ID Mapping and Dynamic Sourcing.
        """
        try:
            # 1. Identity Mapping
            shopify_customer_id = customer_id # Default
            if email:
                try:
                    shopify_customer_id = self.get_or_create_shopify_customer(customer_id, email, referral_code)
                except Exception:
                    # Degrade gracefully to guest-style checkout when Shopify customer sync is unstable.
                    logger.exception("Shopify customer sync failed, fallback to guest checkout")
                    shopify_customer_id = None

            draft_order = shopify.DraftOrder()
            line_items = []
            total_price_usd = Decimal("0.0")
            
            # Metadata for Dynamic Sourcing
            sourcing_hints = []

            # 2. Price Firewall & Dynamic Sourcing Logic
            from app.db.session import SessionLocal
            db = SessionLocal()
            try:
                for item in items:
                    product = db.query(Product).filter_by(id=item["product_id"]).first()
                    if not product:
                        raise Exception(f"Product {item['product_id']} not found in Price Firewall.")
                    
                    price = Decimal(str(product.sale_price))
                    quantity = int(item["quantity"])
                    line_items.append({
                        "variant_id": int(product.shopify_variant_id),
                        "quantity": quantity,
                        "price": str(price),
                        "title": product.title_en or product.title_zh or f"Product {product.id}",
                    })
                    total_price_usd += price * quantity
                    
                    # Hint: In a real v3.6, we'd query multiple suppliers here
                    sourcing_hints.append({
                        "product_id": product.id,
                        "best_supplier": getattr(product, "supplier_id_1688", None) or "primary",
                        "cost_at_creation": str(getattr(product, "source_cost_usd", "0"))
                    })
            finally:
                db.close()

            # 3. Add Metadata for Audit & Rewards
            meta_attributes = [
                {"key": "0buck_user_id", "value": str(customer_id)},
                {"key": "balance_deducted", "value": str(balance_to_use)},
                {"key": "coupon_discount", "value": str(extra_discount)},
                {"key": "price_firewall_verified", "value": "true"},
                {"key": "sourcing_hints", "value": json.dumps(sourcing_hints)}
            ]
            if referral_code:
                meta_attributes.append({"key": "referral_code", "value": referral_code})

            total_discount = max(Decimal("0.0"), balance_to_use) + max(Decimal("0.0"), extra_discount)
            rest_error_message = None

            # Primary path: use resilient REST client to avoid urllib/LibreSSL instability.
            rest_first = self._create_draft_order_via_rest(
                shopify_customer_id=int(shopify_customer_id) if shopify_customer_id else None,
                email=email,
                line_items_payload=line_items,
                total_price_usd=total_price_usd,
                total_discount=total_discount,
                meta_attributes=meta_attributes,
            )
            if rest_first.get("status") == "success":
                return rest_first
            rest_error_message = rest_first.get("message")

            def _apply_common_fields(target_order: shopify.DraftOrder, payload_items: List[Dict[str, Any]]) -> None:
                target_order.line_items = payload_items
                if shopify_customer_id:
                    target_order.customer = {"id": shopify_customer_id}
                    target_order.use_customer_default_address = True
                elif email:
                    target_order.email = email
                if total_discount > 0:
                    actual_discount = min(total_discount, total_price_usd)
                    target_order.applied_discount = {
                        "description": "0Buck Wallet + Coupon Discount",
                        "value": str(actual_discount),
                        "value_type": "fixed_amount",
                        "title": "0Buck Discount"
                    }
                target_order.note_attributes = meta_attributes

            _apply_common_fields(draft_order, line_items)
            
            if draft_order.save():
                return {
                    "status": "success",
                    "draft_order_id": draft_order.id,
                    "invoice_url": draft_order.invoice_url,
                    "total_price": float(total_price_usd),
                    "amount_due": float(draft_order.total_price) # Amount remaining for user to pay
                }
            else:
                errors = draft_order.errors.full_messages()
                # Fallback: if variant is no longer available, retry as custom line items.
                if any("no longer available" in str(msg).lower() for msg in errors):
                    fallback_items = [
                        {
                            "title": item.get("title") or f"Product #{idx + 1}",
                            "quantity": item["quantity"],
                            "price": item["price"],
                        }
                        for idx, item in enumerate(line_items)
                    ]
                    fallback_order = shopify.DraftOrder()
                    _apply_common_fields(fallback_order, fallback_items)
                    if fallback_order.save():
                        return {
                            "status": "success",
                            "draft_order_id": fallback_order.id,
                            "invoice_url": fallback_order.invoice_url,
                            "total_price": float(total_price_usd),
                            "amount_due": float(fallback_order.total_price)
                        }
                    errors = fallback_order.errors.full_messages()
                if rest_error_message is not None:
                    return {"status": "error", "message": {"rest": rest_error_message, "sdk": errors}}
                return {"status": "error", "message": errors}

        except Exception as e:
            logger.exception("Draft Order Creation Failed")
            try:
                if "line_items" in locals() and "shopify_customer_id" in locals():
                    total_discount = max(Decimal("0.0"), balance_to_use) + max(Decimal("0.0"), extra_discount)
                    fallback_res = self._create_draft_order_via_rest(
                        shopify_customer_id=int(shopify_customer_id) if shopify_customer_id else None,
                        email=email,
                        line_items_payload=line_items,
                        total_price_usd=total_price_usd if "total_price_usd" in locals() else Decimal("0.0"),
                        total_discount=total_discount,
                        meta_attributes=meta_attributes if "meta_attributes" in locals() else [],
                    )
                    if fallback_res.get("status") == "success":
                        return fallback_res
            except Exception:
                logger.exception("Draft Order REST fallback failed")
            if "rest_error_message" in locals() and rest_error_message is not None:
                return {"status": "error", "message": {"rest": rest_error_message, "sdk": str(e)}}
            return {"status": "error", "message": str(e)}

    def create_final_order_direct(
        self, 
        customer_id: int, 
        items: List[Dict[str, Any]], 
        balance_used: Decimal,
        referral_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Schema C: Create a Paid Order directly (Full Balance Payment).
        """
        try:
            # 1. Re-calculate price (Firewall)
            total_price_usd = Decimal("0.0")
            line_items = []
            from app.db.session import SessionLocal
            db = SessionLocal()
            try:
                for item in items:
                    product = db.query(Product).filter_by(id=item["product_id"]).first()
                    price = Decimal(str(product.sale_price))
                    quantity = int(item["quantity"])
                    line_items.append({
                        "variant_id": int(product.shopify_variant_id),
                        "quantity": quantity,
                        "price": str(price)
                    })
                    total_price_usd += price * quantity
            finally:
                db.close()

            # 2. Create actual Order with 'paid' status
            if balance_used < total_price_usd:
                return {"status": "error", "message": "insufficient_balance_for_full_payment"}
            new_order = shopify.Order()
            new_order.line_items = line_items
            new_order.financial_status = "paid"
            new_order.customer = {"id": customer_id}
            new_order.note_attributes = [
                {"key": "0buck_user_id", "value": str(customer_id)},
                {"key": "payment_method", "value": "full_wallet_balance"},
                {"key": "balance_deducted", "value": str(balance_used)}
            ]
            if referral_code:
                new_order.note_attributes.append({"key": "referral_code", "value": referral_code})

            if new_order.save():
                return {
                    "status": "success",
                    "order_id": new_order.id,
                    "order_number": new_order.order_number
                }
            else:
                return {"status": "error", "message": new_order.errors.full_messages()}

        except Exception as e:
            logger.exception("Full Balance Order Creation Failed")
            return {"status": "error", "message": str(e)}

    def close(self):
        shopify.ShopifyResource.clear_session()

    def _create_draft_order_via_rest(
        self,
        shopify_customer_id: Optional[int],
        email: Optional[str],
        line_items_payload: List[Dict[str, Any]],
        total_price_usd: Decimal,
        total_discount: Decimal,
        meta_attributes: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Fallback path using Shopify Admin REST via resilient HTTP client."""
        base = f"https://{self.shop_url}/admin/api/{self.api_version}"
        headers = {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        client = ResilientSyncClient(
            name="shopify_admin",
            retries=1,
            timeout_seconds=30.0,
            connect_timeout_seconds=5.0,
        )

        def _normalized_note_attributes() -> List[Dict[str, str]]:
            return [
                {"name": str(x.get("key") or x.get("name") or ""), "value": str(x.get("value") or "")}
                for x in meta_attributes
                if (x.get("key") or x.get("name"))
            ]

        def _build_payload(items: List[Dict[str, Any]]) -> Dict[str, Any]:
            payload: Dict[str, Any] = {
                "draft_order": {
                    "line_items": items,
                    "note_attributes": _normalized_note_attributes(),
                }
            }
            if shopify_customer_id:
                payload["draft_order"]["customer"] = {"id": shopify_customer_id}
                payload["draft_order"]["use_customer_default_address"] = True
            elif email:
                payload["draft_order"]["email"] = email
            if total_discount > 0:
                actual_discount = min(total_discount, total_price_usd)
                payload["draft_order"]["applied_discount"] = {
                    "description": "0Buck Wallet + Coupon Discount",
                    "value": str(actual_discount),
                    "value_type": "fixed_amount",
                    "title": "0Buck Discount",
                }
            return payload

        def _post_draft(items: List[Dict[str, Any]]) -> Dict[str, Any]:
            try:
                resp = client.request(
                    "POST",
                    f"{base}/draft_orders.json",
                    headers=headers,
                    json=_build_payload(items),
                    retry_on_status=(429,),
                )
            except Exception as e:
                response = getattr(e, "response", None)
                if response is not None:
                    try:
                        err_data = response.json() if response.content else {"raw": response.text}
                    except Exception:
                        err_data = {"raw": getattr(response, "text", str(e))}
                    return {"status": "error", "message": err_data}
                raise
            data = resp.json() if resp.content else {}
            if resp.status_code >= 400:
                return {"status": "error", "message": data}
            draft = data.get("draft_order") if isinstance(data, dict) else None
            if not isinstance(draft, dict):
                return {"status": "error", "message": data}
            return {
                "status": "success",
                "draft_order_id": draft.get("id"),
                "invoice_url": draft.get("invoice_url"),
                "total_price": float(total_price_usd),
                "amount_due": float(Decimal(str(draft.get("total_price") or 0))),
            }

        # Try with original items (variant-based) first.
        first = _post_draft(line_items_payload)
        if first.get("status") == "success":
            return first

        # If variants are unavailable, fallback to custom line items.
        msg = str(first.get("message", "")).lower()
        if "no longer available" not in msg:
            return first
        custom_items = [
            {
                "title": item.get("title") or f"Product #{idx + 1}",
                "quantity": item.get("quantity", 1),
                "price": item.get("price", "0"),
            }
            for idx, item in enumerate(line_items_payload)
        ]
        return _post_draft(custom_items)
