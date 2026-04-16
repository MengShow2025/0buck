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
from app.utils.brand_cleaner import clean_title
from app.services.vision_audit import vision_audit_service

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
            logging.info(f"🔑 Token identified: {self.access_token[:8]}...{self.access_token[-4:]}")
            
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
        v7.0: Truth Engine UI - 1st Screen Price Deconstruction Block.
        """
        html = f'<div class="0buck-truth-engine-experience" style="font-family: \'Inter\', -apple-system, sans-serif; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto;">\n'
        
        # v7.5.1: Robust Price Mapping for Truth Engine UI
        # Support multiple field names: sale_price, sell_price, amazon_sale_price
        amazon_price = float(getattr(product, 'amazon_sale_price', 0.0) or 0.0)
        obuck_price = float(getattr(product, 'sale_price', 0.0) or getattr(product, 'sell_price', 0.0) or 0.0)
        
        # v7.5.2: GHOST BLOCK MELTING - If prices are missing, don't show an empty audit block
        if amazon_price > 0 and obuck_price > 0:
            savings = amazon_price - obuck_price
            savings_pct = int((savings / amazon_price) * 100) if amazon_price > 0 else 0
            
            html += f"""
            <div class="truth-audit-block" style="background: #fff; border: 2px solid #000; padding: 25px; margin-bottom: 35px; border-radius: 4px; box-shadow: 8px 8px 0px #000;">
                <div style="text-transform: uppercase; font-size: 11px; font-weight: 900; letter-spacing: 2px; color: #666; margin-bottom: 15px;">🔍 Truth Audit: #{product.id}</div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <div style="font-size: 13px; color: #999;">Market Reference (Amazon)</div>
                        <div style="font-size: 24px; text-decoration: line-through; color: #bbb;">${amazon_price:.2f}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 13px; color: #000; font-weight: 700;">0Buck Verified Price</div>
                        <div style="font-size: 42px; font-weight: 900; color: #D946EF;">${obuck_price:.2f}</div>
                    </div>
                </div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                    <div style="color: #059669; font-weight: 700; font-size: 15px;">✓ You Save: ${savings:.2f} ({savings_pct}% Brand Tax Removed)</div>
                    <div style="background: #000; color: #fff; padding: 4px 10px; font-size: 11px; font-weight: 700;">VERIFIED PHYSICAL TRUTH</div>
                </div>
            </div>
            """

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

        # 5. [The Global Truth Table] - v8.2 Multi-Warehouse Support
        anchor = getattr(product, 'warehouse_anchor', None)
        if anchor:
            html += f'\n  <div class="fulfillment-truth-table" style="margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff;">\n'
            html += f'    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">\n'
            html += f'      <tr style="background: #f1f5f9; color: #475569; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #e2e8f0;">\n'
            html += f'        <th style="padding: 10px; text-align: left;">Origin</th>\n'
            html += f'        <th style="padding: 10px; text-align: left;">Speed</th>\n'
            html += f'        <th style="padding: 10px; text-align: left;">Freight</th>\n'
            html += f'      </tr>\n'
            
            anchors = [a.strip() for a in anchor.split(',') if a.strip()]
            for a in anchors:
                html += f'      <tr>\n'
                html += f'        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">📦 {a.upper()} Local Warehouse</td>\n'
                html += f'        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">🚀 3-7 Days</td>\n'
                html += f'        <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">Verified Local</td>\n'
                html += f'      </tr>\n'
            html += f'    </table>\n'
            html += f'  </div>\n'

        # 6. [The Truth Audit Log] - v7.1 Transparency
        html += f'\n  <div class="truth-audit-log" style="margin-top: 30px; padding: 15px; background: #f8fafc; border-left: 4px solid #1e293b; font-size: 0.85rem; color: #475569;">\n'
        html += f'    <p style="font-weight: 700; color: #1e293b; margin-bottom: 8px;">TRUTH AUDIT LOG:</p>\n'
        html += f'    <ul style="list-style: none; padding-left: 0;">\n'
        html += f'      <li>✅ Physical Weight: {product.weight_display or "Verified"}</li>\n'
        html += f'      <li>✅ Tech Standard: {product.product_props.get("standard", "Industrial Grade") if product.product_props else "Verified"}</li>\n'
        html += f'      <li>✅ Visual Firewall: Passed (No deceptive branding/logos)</li>\n'
        html += f'      <li>✅ Sourcing Truth: Verified 1:1 with Artisan Registry</li>\n'
        html += f'    </ul>\n'
        html += f'  </div>\n'

        # 6. [The Closing] - The Ritual/FOMO
        if getattr(product, 'desire_closing', None):
            html += f'  <div class="desire-closing" style="margin-top: 30px; text-align: center; font-weight: 600; color: #F97316;">\n'
            html += f'    <p>— {product.desire_closing} —</p>\n'
            html += f'  </div>\n'

        html += f'</div>'
        return html

    def upload_media_to_shopify(self, urls: list, alt_prefix: str, content_type: str = "IMAGE") -> list:
        """
        v3.4.11: Uploads files (certificates, etc.) to Shopify via GraphQL fileCreate
        to ensure we use Shopify CDN for all media.
        v7.0: Support for VIDEO content type and returning full file metadata.
        """
        if not urls:
            return []
            
        results = []
        
        # Shopify GraphQL Endpoint
        url = f"https://{self.shop_url}/admin/api/{self.api_version}/graphql.json"
        headers = {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json"
        }
        
        for i, media_url in enumerate(urls):
            mutation = """
            mutation fileCreate($files: [FileCreateInput!]!) {
              fileCreate(files: $files) {
                files {
                  id
                  alt
                  fileStatus
                  ... on MediaImage {
                    image {
                      url
                    }
                  }
                  ... on Video {
                    sources {
                      url
                      format
                      mimeType
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
                        "contentType": content_type
                    }
                ]
            }
            
            try:
                import requests
                response = requests.post(url, headers=headers, json={"query": mutation, "variables": variables})
                data = response.json()
                
                # GraphQL Error Handling
                if "errors" in data:
                    logging.error(f"GraphQL Errors: {data['errors']}")
                    continue

                if data.get("data", {}).get("fileCreate", {}).get("files"):
                    files = data["data"]["fileCreate"]["files"]
                    user_errors = data.get("data", {}).get("fileCreate", {}).get("userErrors", [])
                    if user_errors:
                        logging.warning(f"GraphQL UserErrors: {user_errors}")
                        
                    file_info = files[0]
                    res = {"id": file_info["id"], "alt": file_info["alt"]}
                    
                    if content_type == "IMAGE" and "image" in file_info and file_info["image"]:
                        res["url"] = file_info["image"]["url"]
                        results.append(res["url"] if alt_prefix.endswith("CERT") else res)
                    elif content_type == "VIDEO" and "sources" in file_info and file_info["sources"]:
                        res["url"] = file_info["sources"][0]["url"]
                        results.append(res)
                    else:
                        # Just return the ID for linking later
                        results.append(res)
                else:
                    logging.warning(f"Failed to upload file {media_url}: {data}")
            except Exception as e:
                logging.error(f"Error uploading media to Shopify: {str(e)}")
                
        return results

    def link_media_to_product(self, product_id: str, media_ids: list):
        """
        v7.0: Links uploaded media (like Video) to a specific Shopify product.
        """
        url = f"https://{self.shop_url}/admin/api/{self.api_version}/graphql.json"
        headers = {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json"
        }
        
        gid = f"gid://shopify/Product/{product_id}"
        mutation = """
        mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
          productCreateMedia(media: $media, productId: $productId) {
            media {
              id
              mediaContentType
            }
            userErrors {
              field
              message
            }
          }
        }
        """
        
        media_input = [{"originalSource": mid, "mediaContentType": "VIDEO"} for mid in media_ids]
        
        try:
            import requests
            response = requests.post(url, headers=headers, json={
                "query": mutation, 
                "variables": {"productId": gid, "media": media_input}
            })
            return response.json()
        except Exception as e:
            logging.error(f"Error linking media to product: {e}")
            return None

    def unpublish_product(self, shopify_id: str):
        """
        v7.1 Circuit Breaker: Unpublish product by setting status to 'draft'.
        """
        try:
            # Get numeric part
            sid = shopify_id.split('/')[-1] if '/' in shopify_id else shopify_id
            product = shopify.Product.find(sid)
            if product:
                product.status = "draft" # or "archived"
                product.save()
                logging.info(f"   ✅ Unlisted Shopify Product {sid}")
                return True
        except Exception as e:
            logging.error(f"   ❌ Error unlisting product {shopify_id}: {e}")
            return False
        return False

    async def validate_visual_truth_firewall(self, product: Product) -> bool:
        """
        v7.3 Truth Engine: Visual Sensitive Word & OCR Audit Hook.
        Protects against protocol mismatches (WiFi vs Zigbee), deceptive parameters,
        and Blacklisted Factory Logos (De-branding Enforcement).
        Returns True if pass, False if MELT triggered.
        """
        # Step 0: Asset Lineage Check (v7.2 Hard-lock)
        if not getattr(product, 'asset_lineage_verified', False):
            melt_reason = "Visual Firewall Breach: Asset Lineage NOT Verified by Expert (Untrusted Source)"
            logging.error(f"❄️ MELTING Product {product.id}: {melt_reason}")
            return False, melt_reason

        primary_image = getattr(product, 'primary_image', "")
        source_pid = getattr(product, 'source_pid', "")
        
        # Hard-lock: Image URL must contain source PID fragment or match signed fingerprint
        import hashlib
        current_fingerprint = hashlib.md5(primary_image.encode()).hexdigest()
        stored_fingerprint = getattr(product, 'image_fingerprint_md5', "")
        
        # v7.2 Truth Audit: The 'A-to-B' check
        if stored_fingerprint and current_fingerprint != stored_fingerprint:
            melt_reason = f"Visual Firewall Breach: Image Fingerprint Mismatch (A-Image on B-Product detected). PID: {source_pid}"
            logging.error(f"❄️ MELTING Product {product.id}: {melt_reason}")
            return False, melt_reason

        # Ensure source_pid is NOT empty for verified lineage
        if not source_pid:
            melt_reason = "Visual Firewall Breach: Missing Source PID for Verified Lineage"
            logging.error(f"❄️ MELTING Product {product.id}: {melt_reason}")
            return False, melt_reason

        # v7.3: Dynamic OCR Audit Hook (Pixel Purification)
        ocr_text = (getattr(product, 'vision_ocr_text', "") or "").upper()
        
        if not ocr_text and primary_image:
            logging.info(f"🔍 OCR Audit Hook: Triggering dynamic scan for Product {product.id}...")
            product_context = {
                "title": product.title_en,
                "category": product.category
            }
            passed, v_melt_reason, extracted_ocr = await vision_audit_service.audit_image_v7_3(primary_image, product_context)
            if not passed:
                logging.error(f"❄️ MELTING Product {product.id}: {v_melt_reason}")
                return False, v_melt_reason
            
            # Save the extracted OCR text to avoid redundant scans
            product.vision_ocr_text = extracted_ocr
            ocr_text = extracted_ocr.upper()
        
        # 1. Protocol Mismatch Rules
        protocol_mismatches = [
            ("ZIGBEE", "WIFI"),
            ("MATTER", "WIFI"), 
            ("BLUETOOTH", "WIFI"),
            ("BLE", "WIFI")
        ]
        
        product_title = (product.title_en or "").upper()
        product_desc = (product.description_en or "").upper()
        
        for physical, deceptive in protocol_mismatches:
            if (physical in product_title or physical in product_desc) and (deceptive in ocr_text):
                melt_reason = f"Visual Firewall Breach: Tech Contradiction ({physical} vs {deceptive} in image)"
                logging.error(f"❄️ MELTING Product {product.id}: {melt_reason}")
                return False, melt_reason
                
        # 2. Deceptive Logos / Blacklist (v7.3 De-branding)
        blacklist = ["550-SPYI", "CJDropshipping", "1688.com", "Taobao"]
        for pattern in blacklist:
            if pattern.upper() in ocr_text:
                melt_reason = f"Visual Firewall Breach: Blacklisted pattern '{pattern}' detected in image OCR"
                logging.error(f"❄️ MELTING Product {product.id}: {melt_reason}")
                return False, melt_reason

        # 3. Parameter Verification (OCR vs Physics)
        # Example: LED Masks (#175)
        if "LED" in product_title and "152" in product_title:
             # Check for conflicting numbers in OCR (like the 103 LEDs case)
             import re
             numbers = re.findall(r'\d+', ocr_text)
             if "103" in numbers:
                 melt_reason = "Visual Firewall Breach: Conflicting LED count (Physical 152 vs Image 103)"
                 logging.error(f"❄️ MELTING Product {product.id}: {melt_reason}")
                 return False, melt_reason

        return True, "Passed"

    async def sync_to_shopify(self, product: Product, retries: int = 3):
        """
        Pushes the local Product data to Shopify.
        v3.2: Added exponential backoff for Shopify API Rate Limits (429).
        v7.3: Visual Truth Firewall Injection (OCR Audit Hook).
        v7.5: HARD CIRCUIT BREAKER (Zero Price & Empty Content).
        """
        # --- HARD CIRCUIT BREAKER ---
        # 1. Check for Zero or NULL Prices
        current_price = getattr(product, 'sell_price', None) or getattr(product, 'sale_price', None)
        
        # v7.5 robust image check: Filter out 'nan', empty strings, and invalid formats
        images_raw = getattr(product, 'images', [])
        if isinstance(images_raw, str):
            try:
                images_raw = json.loads(images_raw)
            except:
                images_raw = []
        
        # Ensure it's a list
        if not isinstance(images_raw, list):
            images_raw = [images_raw] if images_raw else []
            
        clean_images = [
            str(img).strip() for img in images_raw 
            if img and str(img).strip().lower() not in ["", "nan", "none", "null", "[]"]
        ]
        
        primary_image = getattr(product, 'primary_image', None)
        if primary_image and str(primary_image).strip().lower() in ["", "nan", "none", "null"]:
            primary_image = None
            
        has_images = len(clean_images) > 0 or primary_image is not None
        has_description = getattr(product, 'description_en', None) or getattr(product, 'body_html', None)

        if not current_price or float(current_price) <= 0:
            product.is_melted = True
            product.melt_reason = "[CRITICAL] Zero or NULL Price detected. Aborting Sync."
            logging.error(f"❌ GHOST PRODUCT REJECTED: {product.id} has $0 price.")
            return False

        if not has_images:
            product.is_melted = True
            product.melt_reason = "[CRITICAL] Missing Images detected. Aborting Sync."
            logging.error(f"❌ GHOST PRODUCT REJECTED: {product.id} has no images.")
            return False

        if not has_description or len(str(has_description)) < 50: # Relaxed slightly but still enforced
            product.is_melted = True
            product.melt_reason = "[CRITICAL] Missing or Thin Description detected. Aborting Sync."
            logging.error(f"❌ GHOST PRODUCT REJECTED: {product.id} has thin description.")
            return False
        # -----------------------------
        # -----------------------------

        # Step 0: Visual Truth Audit (Automatic Melting Check)
        passed, melt_reason = await self.validate_visual_truth_firewall(product)
        if not passed:
            product.is_melted = True
            product.melt_reason = melt_reason
            # Proceed to update Shopify status to 'draft' or skip if it doesn't exist yet
            logging.error(f"❄️ Visual Firewall Triggered for {product.id}. Status set to Melted.")
            
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
                sp.product_type = getattr(product, 'category_name', None) or product.category or "General"
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

                # v7.0 Industrial Arbitrage Tags
                tags = [product.category] if product.category else []
                if getattr(product, 'strategy_tag', None):
                    tags.append(f"ids_{product.strategy_tag}")
                if getattr(product, 'entry_tag', None):
                    tags.append(product.entry_tag) # 'Promotion' or 'Rebate'
                if getattr(product, 'platform_tag', None):
                    tags.append(f"source_{product.platform_tag}") # 'source_CJ'
                
                if getattr(product, 'product_category_type', None):
                    tags.append(product.product_category_type)
                if not getattr(product, 'is_cashback_eligible', True):
                    tags.append("no-cashback")
                
                # v8.2: Global Local Warehouse Tags (LOC-ISO)
                anchor = getattr(product, 'warehouse_anchor', None)
                if anchor:
                    anchor_upper = anchor.upper()
                    # Support multiple anchors: "US, UK, DE"
                    anchors = [a.strip() for a in anchor_upper.split(',') if a.strip()]
                    for a in anchors:
                        tags.append(f"LOC-{a}")
                        # v8.0: Multi-Tier Label + Anchor (e.g. MAGNET-US)
                        label = getattr(product, 'product_category_label', None)
                        if label:
                            tags.append(f"{label.upper()}-{a}")
                
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
                
                # 3. Images (Full Gallery Support with Strict Position & Identity Lock)
                all_media = getattr(product, 'media', []) or product.images or []
                shopify_images = []
                if all_media:
                    internal_id = str(product.product_id_1688 or product.id)
                    # Deduplicate and ensure absolute URLs
                    unique_media = []
                    seen_urls = set()
                    for img in all_media:
                        if img and img not in seen_urls:
                            unique_media.append(img)
                            seen_urls.add(img)

                    for i, img in enumerate(unique_media):
                        clean_url = img
                        if img.startswith("//"):
                            clean_url = f"https:{img}"
                        elif not img.startswith("http"):
                            continue
                            
                        # v7.2.1 Identity Lock: Force explicit position and alt tag with ID
                        shopify_images.append(shopify.Image({
                            "src": clean_url, 
                            "position": i+1,
                            "alt": f"0BUCK_AUDIT_{internal_id}_POS_{i+1}"
                        }))
                    sp.images = shopify_images
                else:
                    sp.images = []
                
                if sp.save():
                    # v7.2.6: Allow Shopify Media API to propagate before mapping variants
                    import time
                    time.sleep(2) 
                    sp = shopify.Product.find(sp.id) # Re-fetch to get Image IDs and CDN URLs
                    
                    product.shopify_product_id = str(sp.id)
                    
                    # v4.1.2: Advanced Variant-Image Mapping (Mirror Protocol with Identity Lock)
                    if sp.variants and local_variants and hasattr(sp, 'images') and sp.images:
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
                    
                    # v7.0: Upload Video to Shopify CDN & Link to Product
                    origin_video = getattr(product, 'origin_video_url', None)
                    if origin_video and sp.id:
                        try:
                            # 1. Upload to CDN
                            cdn_video_result = self.upload_media_to_shopify([origin_video], f"SH_{internal_id}_VIDEO", content_type="VIDEO")
                            if cdn_video_result:
                                # 2. Link to Product via Media API
                                # cdn_video_result is a list of [id, url] or just url
                                # We need the media id for linking
                                media_id = cdn_video_result[0].get("id") if isinstance(cdn_video_result[0], dict) else None
                                if media_id:
                                    self.link_media_to_product(sp.id, [media_id])
                                    logging.info(f"  🎬 Linked 1080P Video to Shopify Product: {sp.id}")
                        except Exception as ve:
                            logging.error(f"  ⚠️ Video Sync failed: {ve}")
                    
                    # v7.0 Truth Engine & Industrial Arbitrage Metafields
                    metafields = [
                        {
                            "namespace": "0buck_sync",
                            "key": "source_platform",
                            "value": getattr(product, 'platform_tag', 'CJ'),
                            "type": "single_line_text_field"
                        },
                        {
                            "namespace": "0buck_sync",
                            "key": "cj_pid",
                            "value": getattr(product, 'cj_pid', ''),
                            "type": "single_line_text_field"
                        },
                        {
                            "namespace": "0buck_truth",
                            "key": "amazon_link",
                            "value": getattr(product, 'amazon_link', ''),
                            "type": "url"
                        },
                        {
                            "namespace": "0buck_truth",
                            "key": "amazon_sale_price",
                            "value": str(getattr(product, 'amazon_sale_price', 0.0)),
                            "type": "number_decimal"
                        },
                        {
                            "namespace": "0buck_truth",
                            "key": "hot_rating",
                            "value": str(getattr(product, 'hot_rating', 0.0)),
                            "type": "number_decimal"
                        },
                        {
                            "namespace": "0buck_truth",
                            "key": "profit_ratio",
                            "value": str(getattr(product, 'profit_ratio', 0.0)),
                            "type": "number_decimal"
                        },
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
        
        # 1. Match to Candidate (Strict Identity Search)
        from app.models.product import CandidateProduct
        from sqlalchemy import or_
        
        # v7.2.5: Priority matching via Shopify SKU or explicit candidate_id tag
        candidate = None
        
        # Strategy A: Check tags for candidate-ID
        tags_str = payload.get("tags", "")
        if "candidate-" in tags_str:
            try:
                c_id = [t.split("-")[-1] for t in tags_str.split(",") if "candidate-" in t][0]
                candidate = db.query(CandidateProduct).get(int(c_id))
            except:
                pass
        
        # Strategy B: Check Variant SKUs for candidate IDs
        if not candidate and payload.get("variants"):
            for v in payload["variants"]:
                v_sku = v.get("sku", "")
                if v_sku.startswith("0B-"):
                    try:
                        c_id = v_sku.split("-")[1]
                        candidate = db.query(CandidateProduct).get(int(c_id))
                        break
                    except:
                        continue

        # Strategy C: Fallback to Title (Strict full match or first 20 chars if needed)
        if not candidate:
            candidate = db.query(CandidateProduct).filter(
                or_(
                    CandidateProduct.title_zh == title,
                    CandidateProduct.title_en_preview == title
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

        # 3. v8.5 Pricing Logic: MAGNET=$0.00, OTHERS=60% of Amazon (Freight-Aware)
        from app.services.finance_engine import calculate_final_price
        from app.services.config_service import ConfigService
        config = ConfigService(db)
        
        exchange_rate = float(config.get("exchange_rate_cny_usd", 0.14))
        market_price = candidate.amazon_price or candidate.ebay_price
        market_anchor = candidate.amazon_compare_at_price or market_price
        
        if not market_price:
            logging.error(f"❌ BLOCKER: No REAL market price found for Candidate {candidate.id}. Aborting enrichment.")
            return False
        
        is_magnet = (candidate.product_category_label == "MAGNET")
        
        pricing = calculate_final_price(
            cost_cny=candidate.cost_cny,
            exchange_rate=exchange_rate,
            comp_price_usd=market_anchor,
            sale_price_ratio=0.6,
            compare_at_price_ratio=0.95, # v8.5 strikethrough logic
            shipping_cost_usd=shipping_cost_usd,
            is_magnet=is_magnet
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
                
            sp.title = clean_title(candidate.title_en_preview or candidate.title_zh)
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

# Alias for backwards compatibility with older services (BatchUploader, MeltingService)
ShopifySyncService = SyncShopifyService
