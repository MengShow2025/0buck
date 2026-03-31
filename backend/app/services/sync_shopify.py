import shopify
from typing import Dict, Any
from backend.app.models.product import Product
from backend.app.core.config import settings

class SyncShopifyService:
    def __init__(self):
        # Configure Shopify session
        self.shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
        self.access_token = settings.SHOPIFY_ACCESS_TOKEN
        self.api_version = "2024-01" # Or latest
        
        # Initialize session
        self.session = shopify.Session(self.shop_url, self.api_version, self.access_token)
        shopify.ShopifyResource.activate_session(self.session)

    def close_session(self):
        shopify.ShopifyResource.clear_session()

    def sync_to_shopify(self, product: Product):
        """
        Pushes the local Product data to Shopify.
        """
        # 1. Create or update the product
        if product.shopify_product_id:
            try:
                sp = shopify.Product.find(product.shopify_product_id)
            except:
                sp = shopify.Product()
        else:
            sp = shopify.Product()

        sp.title = product.title_en
        sp.body_html = product.description_en
        sp.vendor = product.supplier_id_1688 if hasattr(product, 'supplier_id_1688') else "0Buck"
        sp.product_type = product.category
        
        # Variants and Price
        # For simplicity, assuming single variant for now
        sp.variants = [
            {
                "price": product.sale_price,
                "sku": f"1688-{product.product_id_1688}",
                "inventory_management": "shopify"
            }
        ]
        
        # Images
        sp.images = [{"src": img} for img in product.images]
        
        if sp.save():
            product.shopify_product_id = str(sp.id)
            
            # 2. Update Metafields (CRITICAL as per PRD)
            # 1688 original product ID, supplier ID, original cost
            metafields = [
                {
                    "namespace": "0buck_sync",
                    "key": "source_1688_id",
                    "value": product.product_id_1688,
                    "type": "single_line_text_field"
                },
                {
                    "namespace": "0buck_sync",
                    "key": "original_cost",
                    "value": str(product.original_price),
                    "type": "number_decimal"
                },
                {
                    "namespace": "0buck_sync",
                    "key": "source_cost_usd",
                    "value": str(getattr(product, 'source_cost_usd', 0)),
                    "type": "number_decimal"
                },
                {
                    "namespace": "0buck_sync",
                    "key": "last_sync_timestamp",
                    "value": product.last_synced_at.isoformat(),
                    "type": "date_time"
                },
                {
                    "namespace": "0buck_sync",
                    "key": "is_reward_eligible",
                    "value": "true" if getattr(product, 'is_reward_eligible', True) else "false",
                    "type": "single_line_text_field"
                }
            ]
            
            for mf in metafields:
                sp.add_metafield(shopify.Metafield(mf))
                
            return sp
        else:
            raise Exception(f"Failed to save product to Shopify: {sp.errors.full_messages()}")
