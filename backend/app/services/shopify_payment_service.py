import shopify
import logging
from decimal import Decimal
from typing import Dict, Any, Optional, List
from app.core.config import settings
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

    def create_draft_order(
        self, 
        customer_id: int, 
        items: List[Dict[str, Any]], 
        balance_to_use: Decimal = Decimal("0.0"),
        referral_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Schema B: Create a Draft Order with balance deduction.
        """
        try:
            draft_order = shopify.DraftOrder()
            line_items = []
            total_price_usd = Decimal("0.0")

            # 1. Price Firewall: Re-calculate everything from DB
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
                        "price": str(price)
                    })
                    total_price_usd += price * quantity
            finally:
                db.close()

            draft_order.line_items = line_items
            draft_order.customer = {"id": customer_id} # Bind to Shopify Customer ID
            draft_order.use_customer_default_address = True
            
            # 2. Apply Balance Deduction as a Discount
            if balance_to_use > 0:
                # Cap discount at total price
                actual_discount = min(balance_to_use, total_price_usd)
                draft_order.applied_discount = {
                    "description": "0Buck Wallet Balance Deduction",
                    "value": str(actual_discount),
                    "value_type": "fixed_amount",
                    "title": "Wallet Balance"
                }
            
            # 3. Add Metadata for Audit & Rewards
            meta_attributes = [
                {"key": "0buck_user_id", "value": str(customer_id)},
                {"key": "balance_deducted", "value": str(balance_to_use)},
                {"key": "price_firewall_verified", "value": "true"}
            ]
            if referral_code:
                meta_attributes.append({"key": "referral_code", "value": referral_code})
            
            draft_order.note_attributes = meta_attributes
            
            if draft_order.save():
                return {
                    "status": "success",
                    "draft_order_id": draft_order.id,
                    "invoice_url": draft_order.invoice_url,
                    "total_price": float(total_price_usd),
                    "amount_due": float(draft_order.total_price) # Amount remaining for user to pay
                }
            else:
                return {"status": "error", "message": draft_order.errors.full_messages()}

        except Exception as e:
            logger.error(f"Draft Order Creation Failed: {e}")
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
            logger.error(f"Full Balance Order Creation Failed: {e}")
            return {"status": "error", "message": str(e)}

    def close(self):
        shopify.ShopifyResource.clear_session()
