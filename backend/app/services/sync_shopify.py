import shopify
import json
import time
import logging
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any
from app.models.product import Product
from app.core.config import settings

from app.services.cj_service import CJDropshippingService

class SyncShopifyService:
    def __init__(self):
        self.cj_service = CJDropshippingService()
        import os
        os.environ.pop("HTTP_PROXY", None)
        os.environ.pop("HTTPS_PROXY", None)
        os.environ.pop("ALL_PROXY", None)
        
        # Configure Shopify session
        shop_name = settings.SHOPIFY_SHOP_NAME.replace("https://", "").replace("http://", "").rstrip("/")
        if ".myshopify.com" in shop_name:
            self.shop_url = shop_name
        else:
            self.shop_url = f"{shop_name}.myshopify.com"
            
        self.access_token = settings.SHOPIFY_ACCESS_TOKEN
        self.api_version = "2024-01" # Or latest
        
        logging.info(f"🔌 Initializing Shopify Session for: {self.shop_url}")
        
        # v4.6.9: Debugging 401 Unauthorized
        if not self.access_token:
            logging.error("❌ SHOPIFY_ACCESS_TOKEN is missing in environment!")
        elif not self.access_token.startswith("shpat_"):
            logging.warning("⚠️ SHOPIFY_ACCESS_TOKEN does not start with 'shpat_'. Ensure you are using an Admin API Access Token, not an API Key/Secret.")
        else:
            logging.info("🔑 SHOPIFY_ACCESS_TOKEN is configured")
            
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
      
      // Do NOT redirect checkout, cart, or admin/control paths
      var isCheckout = path.indexOf('/checkout') !== -1 || path.indexOf('/cart') !== -1;
      var isAdmin = path.indexOf('/admin') !== -1 || path.indexOf('/control') !== -1 || path.indexOf('/command') !== -1;
      
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
        v4.1.2: Converts the AI-generated English description into a clean HTML format.
        Integrates the 3-Part Desire Script: [The Hook], [The Logic], [The Closing].
        """
        html = f'<div class="product-description" style="font-family: inherit; line-height: 1.6; color: #333;">\n'
        
        # 1. [The Hook] - Bold, Emotional Zapper
        if getattr(product, 'desire_hook', None):
            html += f'  <div class="desire-hook" style="margin-bottom: 20px; font-size: 1.2em; font-weight: 700; color: #000; border-left: 4px solid #F97316; padding-left: 15px;">\n'
            html += f'    {product.desire_hook}\n'
            html += f'  </div>\n'

        # 2. Main Sales Copy (The Narrative)
        formatted_desc = description_en.replace("\n", "</p><p>")
        html += f'  <div class="main-copy" style="margin-bottom: 25px;">\n'
        html += f'    <p>{formatted_desc}</p>\n'
        html += f'  </div>\n'

        # 3. [The Logic] - Brand Tax Deconstruction
        if getattr(product, 'desire_logic', None):
            html += f'  <div class="desire-logic" style="margin-bottom: 25px; background: #f8f8f8; padding: 15px; border-radius: 8px; font-style: italic;">\n'
            html += f'    <p style="margin: 0;"><strong>Artisan Note:</strong> {product.desire_logic}</p>\n'
            html += f'  </div>\n'

        # 3.5 [Fulfillment Truth Table] - v8.0 Warehouse-Aware
        warehouse = getattr(product, 'warehouse_anchor', 'CN')
        shipping_days = "3-7 Days" if "US" in str(warehouse) or "DE" in str(warehouse) else "10-15 Days"
        html += f'''
        <div class="fulfillment-truth" style="margin-bottom: 25px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
            <div style="background: #F3F4F6; padding: 10px 15px; font-weight: 700; font-size: 0.9em; text-transform: uppercase; color: #374151;">Fulfillment Route</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #E5E7EB;">
                <div style="padding: 10px 15px; border-right: 1px solid #E5E7EB;">
                    <span style="display: block; font-size: 0.75em; color: #6B7280; text-transform: uppercase;">Origin</span>
                    <span style="font-weight: 600;">{warehouse} Warehouse</span>
                </div>
                <div style="padding: 10px 15px;">
                    <span style="display: block; font-size: 0.75em; color: #6B7280; text-transform: uppercase;">Speed</span>
                    <span style="font-weight: 600;">{shipping_days}</span>
                </div>
            </div>
            <div style="padding: 10px 15px; border-top: 1px solid #E5E7EB; background: #FFFBEB;">
                <span style="display: block; font-size: 0.75em; color: #D97706; text-transform: uppercase;">Truth Protocol</span>
                <span style="font-weight: 500; font-size: 0.85em; color: #92400E;">Verified Local Inventory. Ships directly from source to minimize carbon & cost.</span>
            </div>
        </div>
        '''

        # 4. Technical Specifications (The Evidence)
        html += f'  <div class="product-specs" style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">\n'
        html += f'    <h3 style="font-size: 1.1em; text-transform: uppercase; letter-spacing: 1px; color: #666;">Technical Specifications</h3>\n'
        html += f'    <ul style="list-style: none; padding: 0;">\n'
        
        specs = {
            "Weight": f"{getattr(product, 'weight', 0.5)} kg",
            "Category": product.category or "General",
            "Sourcing": "0Buck Verified Artisan",
            "Catalog ID": f"SH-{product.product_id_1688}"
        }
        
        # v4.5: Use the new "Three-in-One" Attributes JSONB
        if hasattr(product, 'attributes') and product.attributes:
            for attr in product.attributes[:8]: # Increase to 8 for better detail
                specs[attr.get("label")] = attr.get("value")

        for key, value in specs.items():
            html += f'      <li style="margin-bottom: 8px; border-bottom: 1px solid #f9f9f9; padding-bottom: 4px;">\n'
            html += f'        <strong style="color: #999; display: inline-block; width: 140px;">{key}:</strong> {value}\n'
            html += f'      </li>\n'
            
        html += f'    </ul>\n'
        html += f'  </div>\n'

        # 5. [The Closing] - The Ritual/FOMO
        if getattr(product, 'desire_closing', None):
            html += f'  <div class="desire-closing" style="margin-top: 30px; text-align: center; font-weight: 600; color: #F97316;">\n'
            html += f'    <p>— {product.desire_closing} —</p>\n'
            html += f'  </div>\n'

        html += f'</div>'
        return html

    def upload_media_to_shopify(self, urls: list, alt_prefix: str) -> list:
        """
        v3.4.11: Uploads files (certificates, etc.) to Shopify via GraphQL fileCreate
        to ensure we use Shopify CDN for all media.
        """
        if not urls:
            return []
            
        cdn_urls = []
        
        from app.services.shopify_graphql import ShopifyGraphQLClient
        client = ShopifyGraphQLClient(
            shop_url=self.shop_url,
            access_token=self.access_token,
            api_version=self.api_version,
        )
        
        for i, media_url in enumerate(urls):
            mutation = """
            mutation fileCreate($files: [FileCreateInput!]!) {
              fileCreate(files: $files) {
                files {
                  id
                  alt
                  ... on MediaImage {
                    image {
                      url
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
            """
            variables = {
                "files": [
                    {
                        "originalSource": media_url,
                        "alt": f"{alt_prefix}_{i+1}",
                        "contentType": "IMAGE"
                    }
                ]
            }
            
            try:
                import asyncio
                data = asyncio.run(client.execute(query=mutation, variables=variables))
                
                # GraphQL Error Handling
                if "errors" in data:
                    logging.error(f"GraphQL Errors: {data['errors']}")
                    continue

                if data.get("data", {}).get("fileCreate", {}).get("files"):
                    files = data["data"]["fileCreate"]["files"]
                    user_errors = data.get("data", {}).get("fileCreate", {}).get("userErrors", [])
                    if user_errors:
                        logging.warning(f"GraphQL UserErrors: {user_errors}")
                        
                    if files and "image" in files[0] and files[0]["image"]:
                        cdn_urls.append(files[0]["image"]["url"])
                else:
                    logging.warning(f"Failed to upload file {media_url}: {data}")
            except Exception as e:
                logging.error(f"Error uploading media to Shopify: {str(e)}")
                
        return cdn_urls

    def sync_to_shopify(self, product: Product, retries: int = 1):
        """
        Pushes the local Product data to Shopify.
        v3.2: Added exponential backoff for Shopify API Rate Limits (429).
        """
        import socket
        import shopify
        import time
        socket.setdefaulttimeout(5) # Set a global timeout to avoid hanging forever
        for attempt in range(retries):
            try:
                # 1. Create or update the product
                if product.shopify_product_id:
                    try:
                        sp = shopify.Product.find(product.shopify_product_id)
                    except Exception as e:
                        logger.warning(f"Failed to find shopify product, creating new. Error: {e}")
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
                    import re
                    options = []
                    # v4.6: Dynamic Option Mapping from 1688 spec_attrs
                    first_v = local_variants[0]
                    if not first_v.get("option1") and first_v.get("spec_attrs"):
                        parts = re.split(r'>|&gt;', first_v["spec_attrs"])
                        for idx, p in enumerate(parts):
                            options.append({"name": f"Option {idx+1}"})
                    else:
                        if first_v.get("option1"):
                            options.append({"name": "Color"})
                        if first_v.get("option2"):
                            options.append({"name": "Size"})
                        if first_v.get("option3"):
                            options.append({"name": "Specification"})
                    sp.options = options

                # v8.0 Truth Protocol: Simplified Tagging
                tags = [product.category] if product.category else []
                if getattr(product, 'warehouse_anchor', None):
                    # Direct codes like "US", "DE", "CN"
                    tags.extend([t.strip() for t in str(product.warehouse_anchor).split(",")])
                else:
                    tags.append("CN") # Fallback to CN
                    
                if getattr(product, 'strategy_tag', None):
                    tags.append(f"ids_{product.strategy_tag}")
                if getattr(product, 'product_category_type', None):
                    tags.append(product.product_category_type)
                    
                # 0-Buck-Eligible Rule: Must be Local (Not CN)
                is_local = "CN" not in str(getattr(product, 'warehouse_anchor', "CN")) or len(str(getattr(product, 'warehouse_anchor', "CN")).split(",")) > 1
                if getattr(product, 'is_cashback_eligible', True) and is_local and getattr(product, 'sale_price', 1) == 0:
                    tags.append("0-Buck-Eligible")
                elif not getattr(product, 'is_cashback_eligible', True):
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
                                    
                                # v5.3: Dynamic Discount Logic (Amazon List vs 0Buck Sale)
                                # 0Buck Sale = Amazon Current Sale * 0.6
                                # 0Buck Compare-at = Amazon Original List Price
                                v_price = float(Decimal(str(lv["price"])) * Decimal("0.6"))
                                v_compare_at = float(lv.get("market_list_price", lv["price"]))
                            except Exception as e:
                                logging.warning(f"Variant pricing calculation failed: {str(e)}")

                        # v4.5: Mirror SKU-level Logistics (Weight & Volume)
                        v_weight = lv.get("weight", product.weight or 0.5)
                        if "logistics" in lv and lv["logistics"].get("weight_g"):
                            v_weight = float(lv["logistics"]["weight_g"]) / 1000.0

                        v_data = {
                            "title": lv.get("title", f"Option {i+1}"),
                            "price": v_price,
                            "sku": lv.get("sku_id") or lv.get("sku") or f"1688-{product.product_id_1688}-{i}",
                            "inventory_management": "shopify",
                            "inventory_policy": "deny",
                            "taxable": True,
                            "weight": v_weight,
                            "weight_unit": "kg",
                            "grams": int(v_weight * 1000),
                            "option1": lv.get("option1") or (re.split(r'>|&gt;', lv.get("spec_attrs", ""))[0] if lv.get("spec_attrs") else None),
                            "option2": lv.get("option2") or (re.split(r'>|&gt;', lv.get("spec_attrs", ""))[1] if lv.get("spec_attrs") and len(re.split(r'>|&gt;', lv["spec_attrs"])) > 1 else None),
                            "option3": lv.get("option3") or (re.split(r'>|&gt;', lv.get("spec_attrs", ""))[2] if lv.get("spec_attrs") and len(re.split(r'>|&gt;', lv["spec_attrs"])) > 2 else None),
                            "cost": str(lv.get("cost_usd", product.source_cost_usd))
                        }
                        
                        if v_compare_at:
                            v_data["compare_at_price"] = v_compare_at
                        elif lv.get("compare_at_price"):
                             v_data["compare_at_price"] = lv.get("compare_at_price")
                             
                        variants.append(shopify.Variant(v_data))
                
                sp.variants = variants
                
                # 3. Images (Full Gallery Support with Strict Position)
                all_media = getattr(product, 'media', []) or product.images or []
                shopify_images = []
                if all_media:
                    internal_id = product.product_id_1688
                    for i, img in enumerate(all_media):
                        # Ensure absolute URL
                        clean_url = img
                        if img.startswith("//"):
                            clean_url = f"https:{img}"
                        elif not img.startswith("http"):
                            # Skip invalid URLs
                            continue
                            
                        shopify_images.append(shopify.Image({
                            "src": clean_url, 
                            "position": i+1,
                            "alt": f"SH_{internal_id}_GALLERY_{i+1}"
                        }))
                    sp.images = shopify_images
                else:
                    sp.images = []
                
                if sp.save():
                    product.shopify_product_id = str(sp.id)
                    
                    # v4.1.2: Advanced Variant-Image Mapping (Mirror Protocol)
                    if sp.variants and local_variants and hasattr(sp, 'images'):
                        # Create a map of image source URLs to Shopify image IDs for fallback matching
                        image_url_to_id = {}
                        for s_img in sp.images:
                            if hasattr(s_img, 'src') and s_img.src:
                                # Shopify might modify the URL slightly, but the filename is usually preserved
                                base_url = s_img.src.split('?')[0].split('/')[-1]
                                image_url_to_id[base_url] = s_img.id

                        for i, lv in enumerate(local_variants):
                            if i >= len(sp.variants): break
                            
                            v = sp.variants[i]
                            mapped_img_id = None
                            
                            # Strategy A: Use Mirror-Extractor's image_index (1:1 mapping)
                            img_idx = lv.get("image_index")
                            if img_idx is not None and str(img_idx).isdigit():
                                idx = int(img_idx)
                                if 0 <= idx < len(sp.images):
                                    mapped_img_id = sp.images[idx].id
                            
                            # Strategy B: Fallback to URL matching if Strategy A fails
                            if not mapped_img_id and lv.get("image"):
                                v_img_url = lv["image"]
                                v_base = v_img_url.split('?')[0].split('/')[-1]
                                mapped_img_id = image_url_to_id.get(v_base)
                            
                            if mapped_img_id:
                                v.image_id = mapped_img_id
                                v.save()
                    
                    if sp.variants and not product.shopify_variant_id:
                        product.shopify_variant_id = str(sp.variants[0].id)
                    
                    # v3.4.10: Capture Shopify CDN URLs and save back to local DB
                    # This ensures we use Shopify CDN and avoid 1688 source 404s in frontend
                    if hasattr(sp, 'images') and sp.images:
                        cdn_images = [img.src for img in sp.images if hasattr(img, 'src') and img.src]
                        if cdn_images:
                            product.images = cdn_images
                            product.media = cdn_images # Sync full media gallery
                            logging.info(f"  ✅ Updated Product {product.id} with {len(cdn_images)} Shopify CDN images")
                    
                    # v3.4.11: Upload certificates to Shopify CDN
                    cert_urls = getattr(product, 'certificate_images', [])
                    if cert_urls:
                        cdn_certs = self.upload_media_to_shopify(cert_urls, f"SH_{internal_id}_CERT")
                        if cdn_certs:
                            product.certificate_images = cdn_certs
                    
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
                            "value": json.dumps(product.certificate_images),
                            "type": "json"
                        },
                        {
                            "namespace": "0buck_compliance",
                            "key": "material_info",
                            "value": product.metafields.get("material", "N/A") if hasattr(product, 'metafields') and product.metafields else "N/A",
                            "type": "multi_line_text_field"
                        },
                        {
                            "namespace": "0buck_mirror",
                            "key": "assets",
                            "value": json.dumps(getattr(product, 'mirror_assets', {})),
                            "type": "json"
                        },
                        {
                            "namespace": "0buck_mirror",
                            "key": "structural_data",
                            "value": json.dumps(getattr(product, 'structural_data', {})),
                            "type": "json"
                        },
                        {
                            "namespace": "0buck_mirror",
                            "key": "attributes_full",
                            "value": json.dumps(getattr(product, 'attributes', [])),
                            "type": "json"
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

    async def enrich_from_shopify(self, payload: Dict[str, Any], db):
        """
        v5.3: The 'Brain' Takeover with Freight Intelligence.
        Triggered by Webhook when a product is created in Shopify by a 3rd party tool (DSers/CJ).
        Re-applies 0Buck's comparison, pricing, and desire logic (v5.3 Protocol).
        """
        shopify_id = payload.get("id")
        title = payload.get("title")
        vendor = payload.get("vendor")
        
        # 1. Match to Candidate
        from app.models.product import CandidateProduct
        from sqlalchemy import or_
        
        # Search for candidates that match the title or vendor/source hints
        candidate = db.query(CandidateProduct).filter(
            or_(
                CandidateProduct.title_zh.contains(title[:10]), # Match first 10 chars
                CandidateProduct.title_en_preview.contains(title[:10])
            )
        ).first()
        
        if not candidate:
            logging.warning(f"⚠️ No matching Candidate found for Shopify Product: {title}. Skipping Brain Takeover.")
            return False

        logging.info(f"🧠 Found Candidate matching '{title}': ID {candidate.id}. Starting v5.3 Brain Enrichment...")

        # 2. Freight Sniffing (v5.3 NEW)
        shipping_cost_usd = 3.0 # Conservative Default: $3.00 for small parcel
        try:
            # Check if this candidate already has CJ VID or Sourcing ID
            cj_vid = candidate.structural_data.get("cj_variant_id") if candidate.structural_data else None
            
            if not cj_vid:
                # Try to find it on CJ via keyword (Title)
                search_results = await self.cj_service.search_products(candidate.title_en_preview or candidate.title_zh)
                if search_results:
                    pid = search_results[0].get("pid")
                    detail = await self.cj_service.get_product_detail(pid)
                    if detail and detail.get("variants"):
                        cj_vid = detail["variants"][0].get("vid")
                        # Persist for next time
                        if not candidate.structural_data: candidate.structural_data = {}
                        candidate.structural_data["cj_variant_id"] = cj_vid
                        db.commit()

            if cj_vid:
                freight = await self.cj_service.get_freight_estimate(cj_vid, country_code="US")
                if freight:
                    shipping_cost_usd = float(freight.get("logisticPrice", 3.0))
                    logging.info(f"🚚 REAL CJ Freight Captured for ID {candidate.id}: ${shipping_cost_usd}")
        except Exception as e:
            logging.warning(f"⚠️ CJ Freight Capture failed for {candidate.id}: {e}. Falling back to default.")

        # 3. v5.3 Pricing Logic: Sale_Price = Market_Price * 0.6 (Freight-Aware)
        from app.services.finance_engine import calculate_final_price
        from app.services.config_service import ConfigService
        config = ConfigService(db)
        
        exchange_rate = float(config.get("exchange_rate_cny_usd", 0.14))
        market_price = candidate.amazon_price or candidate.ebay_price
        market_anchor = candidate.amazon_compare_at_price or market_price
        
        if not market_price:
            logging.error(f"❌ BLOCKER: No REAL market price found for Candidate {candidate.id}. Aborting enrichment.")
            return False
        
        pricing = calculate_final_price(
            cost_cny=candidate.cost_cny if candidate.cost_cny is not None else (float(candidate.cost_usd or 0) / exchange_rate),
            exchange_rate=exchange_rate,
            comp_price_usd=market_anchor,
            sale_price_ratio=0.6,
            compare_at_price_ratio=None,
            shipping_cost_usd=shipping_cost_usd
        )
        
        # Force 0Buck's compare_at to be the REAL market anchor (Amazon Price or List Price)
        final_compare_at = float(Decimal(str(market_anchor)).quantize(Decimal("0.01")))
        
        # v5.1 Filter Check: Ratio < 1.5 -> Discard (Stop enrichment if not profitable/safe)
        profit_ratio = pricing["final_price_usd"] / pricing["source_cost_usd"] if pricing["source_cost_usd"] > 0 else 0
        if profit_ratio < 1.5:
            logging.warning(f"⚠️ Profit Ratio {profit_ratio:.2f} < 1.5 for Candidate {candidate.id}. Aborting.")
            return False

        # 4. v5.1 Nine-Point Sniper Methodology Copywriting
        hook = candidate.discovery_evidence.get("desire_hook") if candidate.discovery_evidence else f"Verified Artisan Choice: {candidate.title_en_preview}"
        
        # v5.4 Brute-force Tiering: Conditional Rebate UI
        is_rebate = getattr(candidate, "is_cashback_eligible", True)
        rebate_tag = "20-Phase-Rebate" if is_rebate else "Normal"
        
        rebate_html = ""
        if is_rebate:
            rebate_html = """
            <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; margin-top: 20px;">
                <p><strong>[20-Phase Full Rebate]</strong> 100% Cashback via 20 check-in phases. Your discipline, rewarded.</p>
            </div>
            """
        
        body_html = f"""
        <div class="artisan-protocol-v5">
            <h2 style="color: #111; font-weight: 900; font-size: 24px;">{hook}</h2>
            <p style="margin-top: 20px;"><strong>[The Origin]</strong> Directly sourced from 0Buck Verified Artisan workshops.</p>
            <p><strong>[The Logic]</strong> We strip away brand taxes and middleman fees. You pay for the craft, not the marketing.</p>
            <p><strong>[Artisan Specs]</strong> {candidate.description_en_preview}</p>
            <p style="color: #d00; font-weight: bold;"><strong>[Unbeatable Value]</strong> Priced at 60% of Amazon market value (${market_price}). Original List Price: ${market_anchor}.</p>
            {rebate_html}
            <p style="margin-top: 20px; font-size: 12px; color: #666;"><strong>[Artisan Guarantee]</strong> 0Buck Verified Quality. 10x Crowdfunding Integrity Threshold.</p>
        </div>
        """
        
        # 5. Push Back to Shopify (Physical Anchor)
        try:
            sp = shopify.Product.find(shopify_id)
            if not sp:
                logging.error(f"❌ Shopify Product {shopify_id} not found via API.")
                return False
                
            sp.title = f"{candidate.title_en_preview} | 0Buck Verified Artisan"
            sp.body_html = body_html
            sp.vendor = "0Buck Verified Artisan"
            sp.tags = f"0buck-verified, candidate-{candidate.id}, {rebate_tag}"
            
            for variant in sp.variants:
                variant.price = str(pricing["final_price_usd"])
                variant.compare_at_price = str(final_compare_at)
                variant.sku = f"0B-{candidate.id}-{variant.id}"
                
                # Sync Weight from CJ if we got real shipping cost
                if shipping_cost_usd > 3.0: # If we have a non-default freight, we might have weight
                    pass # Weight is usually already in candidate/shopify
            
            if sp.save():
                logging.info(f"✅ SUCCESS: Product '{sp.title}' enriched and pushed back to Shopify (v5.3 Brain Takeover).")
                candidate.status = "active"
                candidate.shopify_id = str(shopify_id)
                db.commit()
                return True
            else:
                logging.error(f"❌ Shopify Update Failed: {sp.errors.full_messages()}")
                return False
                
        except Exception as e:
            logging.error(f"❌ Error during Shopify Enrichment: {str(e)}")
            return False
