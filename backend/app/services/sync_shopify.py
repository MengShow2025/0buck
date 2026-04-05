import shopify
import json
import time
import logging
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any
from app.models.product import Product
from app.core.config import settings

class SyncShopifyService:
    def __init__(self):
        import os
        os.environ.pop("HTTP_PROXY", None)
        os.environ.pop("HTTPS_PROXY", None)
        os.environ.pop("ALL_PROXY", None)
        
        # Configure Shopify session
        self.shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
        self.access_token = settings.SHOPIFY_ACCESS_TOKEN
        self.api_version = "2024-01" # Or latest
        
        # Initialize session
        self.session = shopify.Session(self.shop_url, self.api_version, self.access_token)
        shopify.ShopifyResource.activate_session(self.session)

    def add_headless_redirect(self, headless_url: str):
        """
        Injects a Javascript redirect into the primary theme to send visitors 
        to the Headless site unless they are in the checkout process.
        """
        themes = shopify.Theme.find()
        main_theme = None
        for t in themes:
            if t.role == "main":
                main_theme = t
                break
        
        if not main_theme:
            print("No main theme found to inject redirect.")
            return False
            
        # Get theme.liquid
        asset = shopify.Asset.find('layout/theme.liquid', theme_id=main_theme.id)
        if not asset:
            print("Could not find layout/theme.liquid")
            return False
            
        content = asset.value
        
        # Check if already injected
        if "headless-redirect" in content:
            print("Redirect already exists in theme.")
            return True
            
        redirect_script = f"""
  <!-- Headless Redirect for 0Buck -->
  <script id="headless-redirect">
    (function() {{
      var headlessDomain = "{headless_url}";
      var path = window.location.pathname;
      var search = window.location.search;
      
      // Do NOT redirect checkout, cart, or admin paths
      var isCheckout = path.indexOf('/checkout') !== -1 || path.indexOf('/cart') !== -1;
      var isAdmin = path.indexOf('/admin') !== -1;
      
      if (!isCheckout && !isAdmin) {{
        window.location.href = headlessDomain + path + search;
      }}
    }})();
  </script>
  <!-- End Headless Redirect -->
"""
        
        # Inject after <head>
        new_content = content.replace("<head>", f"<head>{redirect_script}")
        asset.value = new_content
        
        if asset.save():
            print(f"Successfully injected Headless Redirect to {headless_url}")
            return True
        else:
            print("Failed to save theme asset.")
            return False

    def get_checkout_url(self, variant_id: str, quantity: int = 1) -> str:
        """
        v2.0.2: Generates a direct Shopify Checkout URL for a specific variant.
        Since we are Headless, this allows us to skip the Shopify Cart.
        """
        # The direct checkout URL format for Shopify is:
        # https://{shop}.myshopify.com/cart/{variant_id}:{quantity}
        # We can also add attribution or discount codes here.
        
        # Ensure variant_id is the numeric ID (strip 'gid://shopify/ProductVariant/' if present)
        clean_variant_id = variant_id.split('/')[-1] if '/' in variant_id else variant_id
        
        checkout_url = f"https://{self.shop_url}/cart/{clean_variant_id}:{quantity}"
        print(f"  🛒 Generated Checkout URL: {checkout_url}")
        return checkout_url

    def close_session(self):
        shopify.ShopifyResource.clear_session()

    def format_description_html(self, description_en: str, product: Product) -> str:
        """
        Converts the AI-generated English description into a clean HTML format 
        that looks professional on Shopify and provides clear specifications 
        to help win disputes.
        """
        # Start with the main sales copy
        html = f'<div class="product-description" style="font-family: inherit; line-height: 1.6;">\n'
        
        # v3.2: Move replace completely out of potential f-string evaluation
        # to ensure compatibility with all Python versions (<3.12)
        formatted_desc = description_en.replace("\n", "</p><p>")
        html += "  <p>" + formatted_desc + "</p>\n"
        
        # Add a technical specifications section if data is available
        html += f'  <div class="product-specs" style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">\n'
        html += f'    <h3 style="font-size: 1.1em; text-transform: uppercase; letter-spacing: 1px;">Specifications</h3>\n'
        html += f'    <ul style="list-style: none; padding: 0;">\n'
        
        # Key data points for dispute resolution
        specs = {
            "Weight": f"{getattr(product, 'weight', 0.5)} kg",
            "Category": product.category or "General",
            "Origin": "International Sourcing (Premium Library)",
            "SKU": f"1688-{product.product_id_1688}"
        }
        
        for key, value in specs.items():
            html += f'      <li style="margin-bottom: 8px; border-bottom: 1px solid #f9f9f9; padding-bottom: 4px;">\n'
            html += f'        <strong style="color: #666; display: inline-block; width: 120px;">{key}:</strong> {value}\n'
            html += f'      </li>\n'
            
        html += f'    </ul>\n'
        html += f'  </div>\n'
        html += f'</div>'
        return html

    def sync_to_shopify(self, product: Product, retries: int = 3):
        """
        Pushes the local Product data to Shopify.
        v3.2: Added exponential backoff for Shopify API Rate Limits (429).
        """
        for attempt in range(retries):
            try:
                # 1. Create or update the product
                if product.shopify_product_id:
                    try:
                        sp = shopify.Product.find(product.shopify_product_id)
                    except:
                        sp = shopify.Product()
                else:
                    sp = shopify.Product()

                sp.title = product.title_en
                sp.body_html = self.format_description_html(product.description_en, product)
                
                # Vendor handling: use supplier name if available
                vendor_name = "0Buck Official"
                if hasattr(product, 'supplier') and product.supplier:
                    vendor_name = product.supplier.name or "0Buck Official"
                elif hasattr(product, 'supplier_id_1688') and product.supplier_id_1688:
                    vendor_name = product.supplier_id_1688
                    
                sp.vendor = vendor_name
                sp.product_type = product.category or "General"
                sp.status = "active" if not getattr(product, 'is_melted', False) else "draft"
                
                # v3.2: Multi-level specifications Support
                # Define Options if multi-variants exist
                local_variants = getattr(product, 'variants_data', []) or []
                if local_variants:
                    options = []
                    # Check how many options are used and assign generic names
                    # In a real production environment, these would be mapped from 1688 'spec_attributes'
                    if local_variants[0].get("option1"):
                        options.append({"name": "Color"})
                    if local_variants[0].get("option2"):
                        options.append({"name": "Size"})
                    if local_variants[0].get("option3"):
                        options.append({"name": "Specification"})
                    sp.options = options

                # v3.1 Hybrid Growth Model Tags
                tags = [product.category] if product.category else []
                if getattr(product, 'strategy_tag', None):
                    tags.append(f"ids_{product.strategy_tag}")
                if getattr(product, 'product_category_type', None):
                    tags.append(product.product_category_type)
                if not getattr(product, 'is_cashback_eligible', True):
                    tags.append("no-cashback")
                sp.tags = ", ".join(list(set(tags)))
                
                # 2. Variants and Price (Multi-Variant Support)
                variants = []
                
                if not local_variants:
                    # v3.1 COGS (Cost of Goods Sold) Injection
                    cost_usd = float(product.source_cost_usd) if product.source_cost_usd else 0.0
                    
                    # Fallback for single-variant products
                    v = shopify.Variant({
                        "price": product.sale_price,
                        "sku": f"1688-{product.product_id_1688}",
                        "inventory_management": "shopify",
                        "inventory_policy": "deny",
                        "fulfillment_service": "manual",
                        "requires_shipping": True,
                        "taxable": getattr(product, 'is_taxable', True),
                        "weight": getattr(product, 'weight', 0.5),
                        "weight_unit": "kg",
                        "grams": int(getattr(product, 'weight', 0.5) * 1000),
                        "cost": str(cost_usd) # Syncing cost for Shopify Analytics
                    })
                    if hasattr(product, 'compare_at_price') and product.compare_at_price:
                        v.compare_at_price = product.compare_at_price
                    variants.append(v)
                else:
                    # v3.2: Multi-level specifications & Per-variant pricing
                    # Ensure all variant prices are in USD (sale_price)
                    for i, lv in enumerate(local_variants):
                        # Calculate variant-specific price if CNY price exists in variant data
                        v_price = product.sale_price
                        v_compare_at = product.compare_at_price
                        
                        if lv.get("price"):
                            # Apply the same logic as the main product
                            try:
                                from app.services.finance_engine import calculate_final_price
                                multiplier = 4.0 if product.product_category_type == "PROFIT" else 2.0
                                if not product.is_cashback_eligible:
                                    multiplier = 2.0
                                    
                                p_res = calculate_final_price(lv["price"], settings.EXCHANGE_RATE, multiplier)
                                v_price = p_res["final_price"]
                                # Calculate compare_at based on 60% retail奇袭 rule
                                v_compare_at = float((Decimal(str(v_price)) / Decimal("0.6") * Decimal("0.95")).quantize(Decimal("0.01")))
                            except Exception as e:
                                logging.warning(f"Variant pricing calculation failed: {str(e)}")

                        v_data = {
                            "title": lv.get("title", f"Option {i+1}"),
                            "price": v_price,
                            "sku": lv.get("sku_id") or lv.get("sku") or f"1688-{product.product_id_1688}-{i}",
                            "inventory_management": "shopify",
                            "inventory_policy": "deny",
                            "taxable": True,
                            "weight": lv.get("weight", product.weight or 0.5),
                            "weight_unit": "kg",
                            "grams": int(lv.get("weight", product.weight or 0.5) * 1000),
                            "option1": lv.get("option1"),
                            "option2": lv.get("option2"),
                            "option3": lv.get("option3"),
                            "cost": str(lv.get("cost_usd", product.source_cost_usd))
                        }
                        
                        if v_compare_at:
                            v_data["compare_at_price"] = v_compare_at
                        elif lv.get("compare_at_price"):
                             v_data["compare_at_price"] = lv.get("compare_at_price")
                             
                        variants.append(shopify.Variant(v_data))
                
                sp.variants = variants
                
                # 3. Images (Full Gallery Support)
                all_media = getattr(product, 'media', []) or product.images or []
                if all_media:
                    internal_id = product.product_id_1688
                    sp.images = [
                        shopify.Image({
                            "src": img, 
                            "position": i+1,
                            "alt": f"SH_{internal_id}_GALLERY_{i+1}"
                        }) for i, img in enumerate(all_media)
                    ]
                else:
                    sp.images = []
                
                if sp.save():
                    product.shopify_product_id = str(sp.id)
                    if sp.variants:
                        product.shopify_variant_id = str(sp.variants[0].id)
                    
                    # 4. Metafields (CRITICAL for Dispute Resolution & Content)
                    metafields = [
                        {
                            "namespace": "0buck_sync",
                            "key": "source_1688_id",
                            "value": product.product_id_1688,
                            "type": "single_line_text_field"
                        },
                        {
                            "namespace": "0buck_sync",
                            "key": "last_sync_timestamp",
                            "value": product.last_synced_at.isoformat() if product.last_synced_at else datetime.now().isoformat(),
                            "type": "date_time"
                        },
                        {
                            "namespace": "0buck_legal",
                            "key": "certificates",
                            "value": json.dumps(getattr(product, 'certificate_images', [])),
                            "type": "json"
                        },
                        {
                            "namespace": "0buck_compliance",
                            "key": "material_info",
                            "value": product.metafields.get("material", "N/A") if hasattr(product, 'metafields') and product.metafields else "N/A",
                            "type": "multi_line_text_field"
                        }
                    ]
                    
                    if getattr(product, 'origin_video_url', None):
                        metafields.append({
                            "namespace": "0buck_compliance",
                            "key": "source_video_url",
                            "value": product.origin_video_url,
                            "type": "url"
                        })
                    
                    if hasattr(product, 'metafields') and product.metafields and product.metafields.get("certificates"):
                        metafields.append({
                            "namespace": "0buck_compliance",
                            "key": "certificates",
                            "value": ", ".join(product.metafields["certificates"]),
                            "type": "single_line_text_field"
                        })
                    
                    for mf in metafields:
                        try:
                            sp.add_metafield(shopify.Metafield(mf))
                        except:
                            pass
                        
                    return sp
                else:
                    raise Exception(f"Failed to save product to Shopify: {sp.errors.full_messages()}")

            except Exception as e:
                # Check for 429 Too Many Requests
                if "429" in str(e) and attempt < retries - 1:
                    wait_time = (2 ** attempt) + 1
                    logging.warning(f"Shopify Rate Limit hit. Waiting {wait_time}s before retry {attempt + 1}/{retries}...")
                    time.sleep(wait_time)
                    continue
                else:
                    logging.error(f"Shopify Sync Error: {str(e)}")
                    if attempt == retries - 1:
                        raise e
