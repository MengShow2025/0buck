import json
import httpx
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.product import Product, Supplier, CandidateProduct
from app.utils.mirror_extractor import MirrorExtractor
from app.core.config import settings
from app.core.logistics import find_closest_warehouse
from app.services.finance_engine import calculate_final_price
from app.services.config_service import ConfigService
from app.services.notion import NotionService
from app.services.cj_service import CJDropshippingService
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import logging
import os
import re

logger = logging.getLogger(__name__)

class SupplyChainService:
    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)
        
        # Fetch API keys from DB (Admin-configurable) or Settings
        self.api_key = self.config_service.get_api_key("ALIBABA_1688_API_KEY")
        self.api_secret = self.config_service.get_api_key("ALIBABA_1688_API_SECRET")
        self.api_base_url = settings.ALIBABA_1688_API_URL
        
        # Initialize AI with Admin-configurable key
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=self.config_service.get_api_key("GOOGLE_API_KEY"),
            temperature=0.7
        )
        # v5.3: CJ Dropshipping Integration
        self.cj_service = CJDropshippingService()

    async def fetch_product_details(self, source_product_id: str) -> Dict[str, Any]:
        """
        Fetch product details from the supply library.
        v8.5: Alibaba-First Strategy. Prioritizes ICBU API (507580).
        """
        # 1. Check if we have this in the candidate pool already (Fast Path)
        candidate = self.db.query(CandidateProduct).filter_by(product_id_1688=source_product_id).first()
        if candidate:
            return self._format_candidate_as_details(candidate)

        # 2. Try Real Alibaba ICBU API (App Key: 507580)
        if source_product_id and not source_product_id.startswith("sim_"):
            try:
                # v8.5: Prioritize alibaba.product.get for ICBU Truth
                raw_json = await self._call_1688_api("alibaba.product.get", {"product_id": source_product_id})
                if raw_json:
                    mirror = MirrorExtractor.extract(raw_json)
                    return {
                        "id": source_product_id,
                        "title": mirror.get("title"),
                        "description": mirror.get("description"),
                        "price": float(mirror["variants_raw"][0]["price"]) if mirror.get("variants_raw") else 0.0,
                        "images": mirror.get("mirror_assets", {}).get("hero", {}).get("gallery", []),
                        "media": mirror.get("mirror_assets", {}).get("hero", {}).get("gallery", []),
                        "variants": mirror.get("variants_raw", []),
                        "attributes": mirror.get("attributes", []),
                        "mirror_assets": mirror.get("mirror_assets", {}),
                        "structural_data": mirror.get("structural_data", {}),
                        "supplier": {
                            "id": mirror.get("structural_data", {}).get("trust", {}).get("supplier_id"),
                            "name": mirror.get("structural_data", {}).get("trust", {}).get("factory_name") or "Alibaba Verified Artisan",
                            "rating": mirror.get("structural_data", {}).get("social", {}).get("rating", 4.5),
                            "assurance": True # Trade Assurance
                        },
                        "platform_tag": "ALIBABA"
                    }
            except Exception as e:
                logger.error(f"Alibaba ICBU API Fetch failed for {source_product_id}: {e}")

        # 3. Mock response fallback for simulations (Alibaba-First Mock)
        return {
            "id": source_product_id,
            "title": "Alibaba ICBU Global Item",
            "description": "Premium product sourced via Alibaba International with Global Logistics.",
            "price": 50.0,
            "images": [],
            "variants": [],
            "category": "Artisan Choice",
            "supplier": {
                "id": "ali_verified_artisan", 
                "name": "0Buck Verified Artisan", 
                "rating": 4.8,
                "assurance": True
            },
            "platform_tag": "ALIBABA"
        }

    async def _call_1688_api(self, method: str, params: Dict[str, Any], country_code: str = "US") -> Dict[str, Any]:
        """
        v4.6: Real 1688 API Gateway Integration.
        v8.5 Patch: Uses Residential IP Proxy matching the target country.
        """
        if not self.api_key or not self.api_base_url:
            logger.warning("1688 API Configuration missing. Falling back to simulation.")
            return None
            
        # v8.5 Patch: IP Geo-Match via ProxyManager
        proxies = get_proxy_for_country(country_code)

        async with httpx.AsyncClient(proxies=proxies) as client:
            try:
                if proxies:
                    logger.info(f"🌐 [Geo-Match] Using {country_code} Proxy for Alibaba API")
                # Add authentication headers/params as per 1688 API spec
                api_params = {
                    "method": method,
                    "api_key": self.api_key,
                    "timestamp": datetime.now().isoformat(),
                    **params
                }
                response = await client.get(self.api_base_url, params=api_params, timeout=20.0)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"1688 API Error: {response.status_code} - {response.text}")
                return None
            except Exception as e:
                logger.error(f"1688 API Call failed: {e}")
                return None

    def _format_candidate_as_details(self, candidate: CandidateProduct) -> Dict[str, Any]:
        """
        v8.5: Alibaba-First Data Formatter.
        Ensures Alibaba ICBU Truth (Warehouses, DDP, Assurance) is preserved.
        """
        def safe_json_load(data, default=[]):
            if isinstance(data, (list, dict)): return data
            try:
                return json.loads(data) if data else default
            except (json.JSONDecodeError, TypeError):
                return default

        details = {
            "id": candidate.product_id_1688,
            "title": candidate.title_zh,
            "description": candidate.description_zh,
            "price": candidate.cost_cny,
            "images": safe_json_load(candidate.images),
            "media": safe_json_load(candidate.images),
            "variants": safe_json_load(candidate.variants_raw),
            "category": candidate.category or "Artisan Choice",
            "attributes": safe_json_load(candidate.attributes),
            "mirror_assets": safe_json_load(candidate.mirror_assets, {}),
            "structural_data": safe_json_load(candidate.structural_data, {}),
            "supplier": {
                "id": candidate.supplier_id_1688,
                "name": candidate.supplier_name or "0Buck Verified Artisan",
                "assurance": True, # Alibaba Trade Assurance Default
                **(candidate.supplier_info if isinstance(candidate.supplier_info, dict) else safe_json_load(candidate.supplier_info, {}))
            },
            # v8.2/8.5: Global Truth Logistics
            "warehouse_anchor": candidate.warehouse_anchor,
            "freight_fee": candidate.freight_fee,
            "shipping_days": candidate.shipping_days,
            
            # v7.0: Truth Engine & Industrial Arbitrage
            "amazon_link": candidate.amazon_link,
            "amazon_list_price": candidate.amazon_list_price,
            "amazon_sale_price": candidate.amazon_sale_price,
            "hot_rating": candidate.hot_rating,
            "profit_ratio": candidate.profit_ratio,
            "entry_tag": candidate.entry_tag,
            "platform_tag": candidate.platform_tag or "ALIBABA", # Default to ALIBABA in v8.5
            "cj_pid": candidate.cj_pid,
            "category_id": candidate.category_id,
            "product_props": safe_json_load(candidate.product_props, {}),
            "is_melted": candidate.is_melted,
            "melt_reason": candidate.melt_reason
        }
        return details

    def calculate_price(self, cost_cny: float, comp_price_usd: float = None, category_type: str = "PROFIT", shipping_cost_usd: float = 0.0) -> Dict[str, Any]:
        """Internal logic for profit analysis (v8.5 Hybrid Pricing)"""
        config = ConfigService(self.db)
        sale_ratio = config.get("sale_price_ratio", 0.6)
        strike_ratio = config.get("compare_at_price_ratio", 0.95)
        
        # v8.5: Explicit Tier Check
        is_magnet = category_type == "MAGNET"
        multiplier = 4.0 if category_type in ["PROFIT", "REBATE"] else 2.0
        
        return calculate_final_price(
            cost_cny=cost_cny, 
            exchange_rate=settings.EXCHANGE_RATE, 
            multiplier=multiplier,
            comp_price_usd=comp_price_usd,
            sale_price_ratio=sale_ratio,
            compare_at_price_ratio=strike_ratio,
            shipping_cost_usd=shipping_cost_usd,
            is_magnet=is_magnet
        )

    async def translate_and_enrich(self, raw_data: Dict[str, Any], strategy: str) -> Dict[str, str]:
        """AI Translation & Marketing Polish (v4.0 Desire Engine)"""
        system_prompt = (
            "You are a master of consumer psychology and luxury brand storytelling. "
            "Your task is to transform raw product technical data into high-end, benefit-oriented English marketing copy. "
            "Focus on decoding 'Brand Tax' and highlighting the artisan craftsmanship and industrial integrity.\n\n"
            "RULES:\n"
            "1. NEVER mention 'CJ', 'Dropshipping', 'China', or 'Factory' names.\n"
            "2. NEVER mention 'Amazon' or 'eBay' by name in the description (use 'Traditional Retail' or 'Market Standards').\n"
            "3. The tone must be Professional, Authoritative, and Delicate.\n"
            "4. Highlight materials, responsiveness, and durability based on technical specs.\n\n"
            "Output format must be a valid JSON with the following keys:\n"
            "- title_en: A premium, professional English title (e.g., 'Industrial Grade Sensor' vs 'Smart Alarm').\n"
            "- description_en: A detailed, delicate description including usage scenarios and technical benefits.\n"
            "- desire_hook: (The Hook) A short sentence zapping a pain point.\n"
            "- desire_logic: (The Logic) A paragraph demystifying the brand tax and justifying the artisan direct value.\n"
            "- desire_closing: (The Closing) A CTA emphasizing the 0Buck contract and value logic.\n"
            "Strategy: {strategy}\n"
            "Language: English."
        ).format(strategy=strategy)

        human_content = (
            f"Product Title (ZH): {raw_data.get('title')}\n"
            f"Category: {raw_data.get('category')}\n"
            f"Attributes: {json.dumps(raw_data.get('attributes', []), ensure_ascii=False)}\n"
            f"Price (CNY): {raw_data.get('price')}"
        )

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_content)
            ]
            response = await self.llm.ainvoke(messages)
            content = response.content
            
            # v4.6.8: Handle potential list content (multimodal response format)
            if isinstance(content, list):
                content = content[0].get("text", str(content)) if isinstance(content[0], dict) else str(content[0])

            # Clean up JSON response if it's wrapped in markdown
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            enriched = json.loads(content)
            return {
                "title_en": enriched.get("title_en", f"Global {raw_data.get('title')}"),
                "description_en": enriched.get("description_en", "Premium Artisan quality product."),
                "desire_hook": enriched.get("desire_hook", "Stop paying for brand tax."),
                "desire_logic": enriched.get("desire_logic", "Factory-direct sourcing cuts middleman costs."),
                "desire_closing": enriched.get("desire_closing", "Join the 20-phase rebate revolution.")
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Desire Engine enrichment failed: {e}")
            return {
                "title_en": f"Global {raw_data.get('title')}",
                "description_en": f"Enriched description for {raw_data.get('title')}",
                "desire_hook": "Pain point hook...",
                "desire_logic": "Value logic...",
                "desire_closing": "Closing contract..."
            }

    async def sync_product(self, source_product_id: str, comp_price_usd: float = None, cost_cny: float = None, title: str = None, strategy_tag: str = "IDS_FOLLOWING", category_type: str = "PROFIT", is_cashback_eligible: bool = None, variants_override: List[Dict] = None, images_override: List[str] = None, attributes: List[Dict] = None, logistics_data: Dict = None, mirror_assets: Dict = None, structural_data: Dict = None, desire_hook: str = None, desire_logic: str = None, desire_closing: str = None, visual_fingerprint: str = None, source_platform: str = "ALIBABA", source_url: str = None, backup_source_url: str = None, amazon_price: float = None, ebay_price: float = None, amazon_compare_at_price: float = None, ebay_compare_at_price: float = None, 
                           amazon_link: str = None, hot_rating: float = None, profit_ratio: float = None, entry_tag: str = None, platform_tag: str = "ALIBABA", cj_pid: str = None, category_id: str = None, is_test_product: bool = False, packing_weight: float = None, product_weight: float = None, inventory_total: int = None, entry_code: str = None, entry_name: str = None, product_props: Dict = None,
                           is_melted: bool = False, melt_reason: str = None,
                           category_name: str = None, primary_image: str = None, variant_images: List[str] = None, detail_images_html: str = None,
                           sell_price: float = None, variant_sell_price: float = None, dimensions_display: str = None, weight_display: str = None,
                           freight_fee: float = None, shipping_days: str = None, warehouse_anchor: str = None,
                           variant_sku: str = None, variant_key: str = None, brand_tax_percent: str = None):
        """
        v8.5: Alibaba-First Strategic Sync.
        Prioritizes Alibaba ICBU (App Key: 507580) as the primary Truth source.
        """
        logger.info(f"🚀 Alibaba-First Sync triggered for {source_product_id}")
        raw_data = await self.fetch_product_details(source_product_id)
        if cost_cny:
            raw_data["price"] = cost_cny
        if title:
            raw_data["title"] = title
        if images_override:
            raw_data["images"] = images_override
            raw_data["media"] = images_override
        if variants_override:
            raw_data["variants"] = variants_override
        if attributes:
            raw_data["attributes"] = attributes
        if logistics_data:
            raw_data["logistics_data"] = logistics_data
        if mirror_assets:
            raw_data["mirror_assets"] = mirror_assets
        if structural_data:
            raw_data["structural_data"] = structural_data
        if visual_fingerprint:
            raw_data["visual_fingerprint"] = visual_fingerprint
        
        # v7.0 Truth Engine & Industrial Arbitrage
        if amazon_link: raw_data["amazon_link"] = amazon_link
        if hot_rating: raw_data["hot_rating"] = hot_rating
        if profit_ratio: raw_data["profit_ratio"] = profit_ratio
        if entry_tag: raw_data["entry_tag"] = entry_tag
        if platform_tag: raw_data["platform_tag"] = platform_tag
        if cj_pid: raw_data["cj_pid"] = cj_pid
        if category_id: raw_data["category_id"] = category_id
        if is_test_product is not None: raw_data["is_test_product"] = is_test_product
        if packing_weight: raw_data["packing_weight"] = packing_weight
        if product_weight: raw_data["product_weight"] = product_weight
        if inventory_total: raw_data["inventory_total"] = inventory_total
        if entry_code: raw_data["entry_code"] = entry_code
        if entry_name: raw_data["entry_name"] = entry_name
        if product_props: raw_data["product_props"] = product_props
        if is_melted is not None: raw_data["is_melted"] = is_melted
        if melt_reason: raw_data["melt_reason"] = melt_reason
        
        # cj_fields_matrix.csv fields
        if category_name: raw_data["category_name"] = category_name
        if primary_image: raw_data["primary_image"] = primary_image
        if variant_images: raw_data["variant_images"] = variant_images
        if detail_images_html: raw_data["detail_images_html"] = detail_images_html
        if sell_price: raw_data["sell_price"] = sell_price
        if variant_sell_price: raw_data["variant_sell_price"] = variant_sell_price
        if dimensions_display: raw_data["dimensions_display"] = dimensions_display
        if weight_display: raw_data["weight_display"] = weight_display
        if freight_fee: raw_data["freight_fee"] = freight_fee
        if shipping_days: raw_data["shipping_days"] = shipping_days
        if warehouse_anchor: raw_data["warehouse_anchor"] = warehouse_anchor
        if variant_sku: raw_data["variant_sku"] = variant_sku
        if variant_key: raw_data["variant_key"] = variant_key
        if brand_tax_percent: raw_data["brand_tax_percent"] = brand_tax_percent
        
        # v4.7.1: Sourcing Provenance
        if source_platform:
            raw_data["source_platform"] = source_platform
        if source_url:
            raw_data["source_url"] = source_url
        if backup_source_url:
            raw_data["backup_source_url"] = backup_source_url

        pricing_result = self.calculate_price(raw_data["price"], comp_price_usd or 0, category_type)

        # v8.5: Full Pixel & Narrative Refinery (Desire Engine)
        from app.utils.proxy_manager import get_proxy_for_country
        from app.services.refinery_gateway import refinery_gateway
        refinery_input = {
            "id": source_product_id,
            "title_en": raw_data.get("title"),
            "title_zh": raw_data.get("title"),
            "amazon_link": amazon_link,
            "amazon_price": comp_price_usd or pricing_result.get("amazon_price", 0),
            "obuck_price": pricing_result.get("final_price_usd", 0),
            "amazon_bullets": raw_data.get("description_zh", ""),
            "images": json.dumps(raw_data.get("images", [])),
            "warehouse_anchor": warehouse_anchor,
            "shipping_days": shipping_days,
            "cost_cny": raw_data["price"],
            "brand_tax_percent": raw_data.get("brand_tax_percent", "300%")
        }
        refined = await refinery_gateway.refine_candidate(refinery_input)

        # Ensure Supplier exists
        supplier = self.db.query(Supplier).filter_by(supplier_id_1688=raw_data["supplier"]["id"]).first()
        if not supplier:
            location_province = raw_data["supplier"].get("province", "Guangdong")
            location_city = raw_data["supplier"].get("city", "Shenzhen")
            country_code = raw_data["supplier"].get("country_code", "CN")
            warehouse = find_closest_warehouse(location_province, location_city, country_code)
            
            supplier = Supplier(
                supplier_id_1688=raw_data["supplier"]["id"],
                name=raw_data["supplier"].get("name") or raw_data["supplier"].get("factory_name", "Unknown Factory"),
                rating=raw_data["supplier"].get("rating", 4.5),
                location_province=location_province,
                location_city=location_city,
                warehouse_anchor=warehouse.get("country", warehouse["name"])
            )
            self.db.add(supplier)
            self.db.commit()
            self.db.refresh(supplier)
            
        product = self.db.query(Product).filter_by(product_id_1688=source_product_id).first()
        if not product:
            product = Product(product_id_1688=source_product_id)
            self.db.add(product)
            
        product.title_zh = raw_data.get("title")
        product.title_en = refined.get("title_polished", f"Global {raw_data.get('title')}")
        product.description_zh = raw_data.get("description")
        product.description_en = refined.get("description_artisan", "Premium Artisan quality product.")
        
        product.desire_hook = desire_hook or refined.get("desire_hook", "Stop paying for brand tax.")
        product.desire_logic = desire_logic or refined.get("desire_logic", "Factory-direct sourcing cuts middleman costs.")
        product.desire_closing = desire_closing or refined.get("desire_closing", "Join the 20-phase rebate revolution.")
        
        product.original_price = cost_cny
        product.source_cost_usd = pricing_result.get("source_cost_usd")
        product.sale_price = pricing_result.get("final_price_usd")
        product.compare_at_price = pricing_result.get("compare_at_price")
        
        # v4.6.8: Platform Comparison
        product.amazon_price = amazon_price
        product.ebay_price = ebay_price
        product.amazon_compare_at_price = amazon_compare_at_price
        product.ebay_compare_at_price = ebay_compare_at_price
        
        # v7.0: Truth Engine & Industrial Arbitrage
        product.amazon_link = raw_data.get("amazon_link")
        product.amazon_list_price = amazon_compare_at_price
        product.amazon_sale_price = amazon_price
        product.hot_rating = raw_data.get("hot_rating")
        product.profit_ratio = raw_data.get("profit_ratio")
        product.entry_tag = raw_data.get("entry_tag")
        product.platform_tag = raw_data.get("platform_tag", "CJ")
        product.shipping_ratio = pricing_result.get("shipping_ratio")
        product.shipping_warning = pricing_result.get("shipping_warning")
        product.is_melted = raw_data.get("is_melted", False)
        product.melt_reason = raw_data.get("melt_reason")
        
        # cj_fields_matrix.csv fields
        product.category_name = raw_data.get("category_name")
        product.primary_image = raw_data.get("primary_image")
        product.variant_images = raw_data.get("variant_images", [])
        product.detail_images_html = raw_data.get("detail_images_html")
        product.sell_price = raw_data.get("sell_price")
        product.variant_sell_price = raw_data.get("variant_sell_price")
        product.dimensions_display = raw_data.get("dimensions_display")
        product.weight_display = raw_data.get("weight_display")
        product.freight_fee = raw_data.get("freight_fee")
        product.shipping_days = raw_data.get("shipping_days")
        product.warehouse_anchor = raw_data.get("warehouse_anchor")
        product.variant_sku = raw_data.get("variant_sku")
        product.variant_key = raw_data.get("variant_key")
        
        # CJ Specific Meta (Step 6)
        product.cj_pid = raw_data.get("cj_pid")
        product.category_id = raw_data.get("category_id")
        product.is_test_product = raw_data.get("is_test_product", False)
        product.packing_weight = raw_data.get("packing_weight")
        product.product_weight = raw_data.get("product_weight")
        product.inventory_total = raw_data.get("inventory_total")
        product.entry_code = raw_data.get("entry_code")
        product.entry_name = raw_data.get("entry_name")
        product.product_props = raw_data.get("product_props", {})
        
        product.is_reward_eligible = pricing_result.get("is_reward_eligible", True)
        product.product_category_label = category_type # v8.5 labeling
        product.images = raw_data.get("images", [])
        product.media = raw_data.get("media", [])
        product.variants_data = raw_data.get("variants", [])
        product.origin_video_url = raw_data.get("origin_video_url")
        product.metafields = raw_data.get("metafields", {})
        product.attributes = raw_data.get("attributes", [])
        product.logistics_data = raw_data.get("logistics_data", {})
        product.mirror_assets = raw_data.get("mirror_assets", {})
        product.structural_data = raw_data.get("structural_data", {})
        product.visual_fingerprint = raw_data.get("visual_fingerprint")
        
        # v4.7.1: Sourcing Provenance
        product.source_platform = raw_data.get("source_platform", "1688")
        product.source_url = raw_data.get("source_url")
        product.backup_source_url = raw_data.get("backup_source_url")
        
        product.weight = raw_data.get("weight", 0.5)
        product.category = raw_data.get("category", "General")
        product.supplier_id = supplier.id
        product.strategy_tag = strategy_tag
        
        final_eligible = is_cashback_eligible if is_cashback_eligible is not None else pricing_result.get("is_cashback_eligible", True)
        product.is_cashback_eligible = final_eligible
        
        if not final_eligible:
            product.product_category_type = "TRAFFIC"
        else:
            product.product_category_type = category_type 
        
        if "suppliers" in raw_data:
             product.backup_suppliers = raw_data["suppliers"][:3]
             
        product.last_synced_at = datetime.utcnow()
        
        self.db.commit()
        return product

    def _ensure_absolute_url(self, url: str) -> str:
        if not url: return ""
        if url.startswith("http"): return url
        if url.startswith("//"): return f"https:{url}"
        if len(url) > 10 and "." in url and not "/" in url:
            return f"https://sc01.alicdn.com/kf/{url}"
        return url

    async def _fetch_market_prices(self, product_name: str) -> Dict[str, Any]:
        """v5.2: Fetch real Amazon/eBay prices and list prices using web_search (Exa AI)."""
        from app.services.tools import _web_search_func
        
        prices = {
            "amazon_price": None, 
            "ebay_price": None,
            "amazon_compare_at_price": None,
            "ebay_compare_at_price": None,
            "market_comparison_url": None
        }
        
        try:
            # 1. Search Amazon
            amazon_query = f"{product_name} current price list price on amazon.com"
            # v5.4: Call underlying async func directly to avoid StructuredTool sync issues in some envs
            amazon_results = await _web_search_func(amazon_query)
            for res in amazon_results:
                if isinstance(res, dict):
                    text = f"{res.get('title', '')} {res.get('text', '')}"
                    url = res.get('url', '')
                    
                    # A. Current Price
                    price_match = re.search(r"(?:Price|Now|Only):\s*\$\s?([\d,]+(\.\d{1,2})?)", text, re.I)
                    if not price_match:
                        price_match = re.search(r"\$\s?([\d,]+(\.\d{1,2})?)", text)
                    
                    if price_match and not prices["amazon_price"]:
                        prices["amazon_price"] = float(price_match.group(1).replace(",", ""))
                        if not prices["market_comparison_url"] and "amazon.com" in url:
                            prices["market_comparison_url"] = url
                    
                    # B. List Price (Was / MSRP)
                    list_match = re.search(r"(?:List Price|Was|MSRP|Original Price):\s*\$\s?([\d,]+(\.\d{1,2})?)", text, re.I)
                    if list_match and not prices["amazon_compare_at_price"]:
                        prices["amazon_compare_at_price"] = float(list_match.group(1).replace(",", ""))
                    
                    if prices["amazon_price"] and prices["amazon_compare_at_price"]:
                        break
            
            # 2. Search eBay (if Amazon failed or for redundancy)
            if not prices["amazon_price"]:
                ebay_query = f"{product_name} current price list price on ebay.com"
                ebay_results = await _web_search_func(ebay_query)
                for res in ebay_results:
                    if isinstance(res, dict):
                        text = f"{res.get('title', '')} {res.get('text', '')}"
                        url = res.get('url', '')
                        
                        # A. Current Price
                        price_match = re.search(r"(?:Price|Now|Only|Buy It Now):\s*\$\s?([\d,]+(\.\d{1,2})?)", text, re.I)
                        if not price_match:
                            price_match = re.search(r"\$\s?([\d,]+(\.\d{1,2})?)", text)
                        
                        if price_match and not prices["ebay_price"]:
                            prices["ebay_price"] = float(price_match.group(1).replace(",", ""))
                            if not prices["market_comparison_url"] and "ebay.com" in url:
                                prices["market_comparison_url"] = url
                        
                        # B. List Price (Was / MSRP)
                        list_match = re.search(r"(?:List Price|Was|Original Price):\s*\$\s?([\d,]+(\.\d{1,2})?)", text, re.I)
                        if list_match and not prices["ebay_compare_at_price"]:
                            prices["ebay_compare_at_price"] = float(list_match.group(1).replace(",", ""))
                            
                        if prices["ebay_price"] and prices["ebay_compare_at_price"]:
                            break
                    
        except Exception as e:
            logger.error(f"Error fetching market prices for {product_name}: {e}")
            
        return prices

    def _calculate_visual_fingerprint(self, image_url: str) -> str:
        """v4.6.7: Generate a unique MD5 hash for image-based deduplication."""
        import hashlib
        if not image_url:
            return None
        # Hash the URL as a proxy for visual content in simulation/high-speed mode
        return hashlib.md5(image_url.encode('utf-8')).hexdigest()

    async def ids_sniffing_and_populate(self, keyword: str = "Artisan Watch"):
        """
        v4.6: Real 1688 API Search + Candidate Ingestion.
        v5.2: Real Amazon/eBay price sniffing via Exa.
        """
        signals = []
        
        # 1. Attempt Real 1688 Search API
        search_results = await self._call_1688_api("alibaba.search.product", {"keyword": keyword})
        if search_results and "products" in search_results:
            for p in search_results["products"][:10]: # Process top 10
                p_name = p.get("title") or keyword
                market = await self._fetch_market_prices(p_name)
                
                # v5.2: Use real market prices if found. If not found, skip or set as None to prevent fabrication.
                amazon_price = market["amazon_price"]
                ebay_price = market["ebay_price"]
                
                if not amazon_price:
                    logger.warning(f"⚠️ No real Amazon price found for {p_name}. Skipping to maintain 0Buck integrity.")
                    continue

                # v5.2.1: No fictional multipliers. Use price if list price missing.
                amazon_compare = market["amazon_compare_at_price"] or amazon_price
                ebay_compare = market["ebay_compare_at_price"] or ebay_price
                
                signals.append({
                    "id_1688": p.get("id"),
                    "name": p_name,
                    "cost_cny": p.get("price"),
                    "comp_price": amazon_price,
                    "amazon_price": amazon_price,
                    "ebay_price": ebay_price,
                    "amazon_compare_at_price": amazon_compare,
                    "ebay_compare_at_price": ebay_compare,
                    "market_comparison_url": market.get("market_comparison_url"),
                    "raw_json": p,
                    "strategy_tag": "IDS_SEARCH"
                })
        
        # 2. Simulation Mode Fallback
        if not signals:
            logger.info("Falling back to simulation mode for IDS_FOLLOWING")
            test_raw_dir = "/Volumes/SAMSUNG 970/AccioWork/coder/0buck/data/1688"
            test_files = ["test_raw_1.json", "test_raw_2.json", "test_raw_3.json"]
            
            for i, fname in enumerate(test_files):
                fpath = os.path.join(test_raw_dir, fname)
                if os.path.exists(fpath):
                    with open(fpath, 'r', encoding='utf-8') as f:
                        raw_json = json.load(f)
                    
                    mirror = MirrorExtractor.extract(raw_json)
                    product_name = mirror.get("title", f"Test Product {i+1}")
                    
                    # v5.2: Real market prices even in simulation mode. If missing, do not invent.
                    market = await self._fetch_market_prices(product_name)
                    
                    cost_cny = float(mirror["variants_raw"][0]["price"]) if mirror.get("variants_raw") else 100.0
                    amazon_price = market["amazon_price"]
                    ebay_price = market["ebay_price"]
                    
                    if not amazon_price:
                        logger.warning(f"⚠️ No real market price for {product_name} in simulation. Skip.")
                        continue
                        
                    # v5.2.1: No fictional multipliers
                    amazon_compare = market["amazon_compare_at_price"] or amazon_price
                    ebay_compare = market["ebay_compare_at_price"] or ebay_price
                    
                    signals.append({
                        "id_1688": f"sim_{i+1}_{mirror.get('product_id', 'unknown')}",
                        "name": product_name,
                        "supplier_id_1688": f"sim_supplier_{i+1}",
                        "cost_cny": cost_cny,
                        "comp_price": amazon_price, # Main competitor price
                        "amazon_price": amazon_price,
                        "ebay_price": ebay_price,
                        "amazon_compare_at_price": amazon_compare,
                        "ebay_compare_at_price": ebay_compare,
                        "market_comparison_url": market.get("market_comparison_url"),
                        "raw_json": raw_json,
                        "strategy_tag": "IDS_FOLLOWING"
                    })

        for s in signals:
            await self.ingest_to_candidate_pool(s)
        
        return len(signals)

    async def brute_force_roi_scan(self, page_count: int = 1):
        """
        v5.4: Brute-force ROI Comparison Scan.
        ...
        """
        logger.info(f"🚀 Starting Brute-force ROI Comparison Scan ({page_count} pages)...")
        total_ingested = 0
        
        for page in range(1, page_count + 1):
            try:
                # Fetch CJ products (no keyword for brute force)
                cj_products = await self.cj_service.search_products(page=page, size=20, only_cj_owned=True)
                if not cj_products:
                    logger.warning(f"⚠️ No products found on CJ page {page}.")
                    break
                
                for p in cj_products:
                    name = p.get("nameEn") or p.get("productName")
                    pid = p.get("id") or p.get("pid")
                    
                    # 1. Calculate Landed Cost (CJ Sell Price + Simulation Freight)
                    cost_usd_raw = p.get("sellPrice") or p.get("productSellPrice") or "0"
                    # 取价格范围的最小值（最低拿货价，最保守成本估算）
                    if " -- " in str(cost_usd_raw):
                        cost_usd = float(str(cost_usd_raw).split(" -- ")[0].strip())
                    else:
                        cost_usd = float(str(cost_usd_raw))
                        
                    # Simulating freight: 25% of cost + $5 base
                    freight_sim = cost_usd * 0.25 + 5.0
                    landed_cost = cost_usd + freight_sim
                    
                    # 2. Fetch Amazon Market Prices
                    market_data = await self._fetch_market_prices(name)
                    amazon_price = market_data.get("amazon_price")
                    amazon_msrp = market_data.get("amazon_compare_at_price") or amazon_price
                    market_url = market_data.get("market_comparison_url")
                    
                    if not amazon_msrp or not market_url:
                        logger.debug(f"⏭️ Missing real market data for {name}. Skipping to maintain truth protocol.")
                        continue
                        
                    # 3. Apply ROI Logic
                    # 0Buck Sell Price = Amazon MSRP * 0.6
                    target_price = amazon_msrp * 0.6
                    roi = target_price / landed_cost if landed_cost > 0 else 0
                    
                    category_type = None
                    is_cashback = False
                    discovery_source = "IDS_BRUTE_FORCE"
                    
                    if roi >= 4.0:
                        category_type = "PROFIT"
                        is_cashback = True
                        discovery_source = "IDS_BRUTE_FORCE_REBATE"
                    elif roi >= 1.5:
                        category_type = "TRAFFIC"
                        is_cashback = False
                        discovery_source = "IDS_BRUTE_FORCE_NORMAL"
                    else:
                        logger.debug(f"⏭️ ROI too low ({roi:.2f}) for {name}. Skipping.")
                        continue
                        
                    # 4. Fetch Full Product Detail for Mirroring (Images, Description, Specs)
                    full_detail = await self.cj_service.get_product_detail(pid)
                    if not full_detail:
                        logger.warning(f"⚠️ Could not fetch full detail for {name} ({pid}). Skipping.")
                        continue
                        
                    # Extract rich assets
                    detail_images = full_detail.get("productImage", "").split(",")
                    description_html = full_detail.get("description", "")
                    
                    # 5. Ingest to Candidate Pool
                    logger.info(f"✅ Hit! {name} | ROI: {roi:.2f} | Category: {category_type} | URL: {market_url}")
                    
                    # Prepare data for ingestion
                    await self.ingest_to_candidate_pool({
                        "id_1688": f"cj_{pid}", # Using cj_ prefix for CJ source
                        "name": name,
                        "cost_cny": landed_cost / (settings.EXCHANGE_RATE * (1 + settings.EXCHANGE_BUFFER)), # Reverse buffer back to CNY for storage consistency
                        "comp_price": amazon_msrp,
                        "amazon_price": amazon_price,
                        "amazon_compare_at_price": amazon_msrp,
                        "market_comparison_url": market_url,
                        "strategy_tag": discovery_source,
                        "category": p.get("categoryName") or "General",
                        "category_type": category_type,
                        "is_cashback_eligible": is_cashback,
                        "source_platform": "CJ",
                        "source_url": f"https://app.cjdropshipping.com/product-detail.html?id={pid}",
                        "images": detail_images,
                        "description_zh": description_html,
                        "structural_data": {
                            "description_html": description_html,
                            "roi": round(roi, 2),
                            "amazon_msrp": amazon_msrp,
                            "landed_cost": landed_cost,
                            "cj_id": pid,
                            "market_url": market_url,
                            "cj_raw": full_detail
                        },
                        "discovery_evidence": {
                            "roi": round(roi, 2),
                            "amazon_msrp": amazon_msrp,
                            "landed_cost": landed_cost,
                            "cj_id": pid,
                            "market_url": market_url
                        }
                    })
                    total_ingested += 1
                    
            except Exception as e:
                logger.error(f"Error scanning page {page}: {e}")
                
        logger.info(f"🏁 Brute-force Scan complete. Ingested {total_ingested} candidates.")
        return total_ingested

    async def batch_process_pids(self, pid_list: List[str], category_type: str = "NORMAL"):
        """
        v8.5 Scaling Engine: Parallel processing for high-volume ingestion.
        """
        semaphore = asyncio.Semaphore(5) # Control concurrency to respect API limits
        
        async def process_one(pid):
            async with semaphore:
                try:
                    logger.info(f"🚀 Scaling Engine: Processing PID {pid}...")
                    # 1. Fetch from Alibaba
                    raw_data = await self.fetch_product_details(pid)
                    if not raw_data: return
                    
                    # 2. Ingest and Refine
                    raw_data["category_type"] = category_type
                    await self.ingest_to_candidate_pool(raw_data)
                    logger.info(f"✅ Scaled: {pid} is now in candidate pool.")
                except Exception as e:
                    logger.error(f"❌ Scale Fail for {pid}: {e}")

        tasks = [process_one(pid) for pid in pid_list]
        await asyncio.gather(*tasks)
        product_id_1688 = data.get("id_1688")
        if not product_id_1688: return

        exists = self.db.query(CandidateProduct).filter_by(product_id_1688=product_id_1688).first()
        if exists: return
        
        prod_exists = self.db.query(Product).filter_by(product_id_1688=product_id_1688).first()
        if prod_exists: return

        cost_cny = float(data.get("cost_cny", 0.0))
        comp_price = float(data.get("comp_price", 0.0))
        amazon_price = float(data.get("amazon_price", comp_price))
        amazon_compare_at = float(data.get("amazon_compare_at_price", amazon_price))
        market_url = data.get("market_comparison_url")
        
        # v5.4 Truth Protocol: Ensure market comparison URL exists for new candidates
        if not market_url and data.get("source_platform") == "CJ":
            logger.warning(f"⚠️ Skipping ingestion for {data.get('name')}: No market comparison URL provided.")
            return

        # v8.5 Truth Engine: Selection Threshold
        # threshold = (Amazon Sale Price * 60%) / Alibaba Item Cost
        alibaba_item_cost_usd = cost_cny * settings.EXCHANGE_RATE
        selection_threshold = (amazon_price * 0.6) / alibaba_item_cost_usd if alibaba_item_cost_usd > 0 else 0
        
        category_type = data.get("category_type")
        is_cashback_eligible = data.get("is_cashback_eligible")
        
        if category_type is None:
            # Check for MAGNET Tier first (Zero-Cost arbitrage)
            # MAGNET: Amazon Shipping > Our Total Landed Cost (roughly)
            amz_shipping = data.get("discovery_evidence", {}).get("amazon_shipping_fee", 6.99)
            if amz_shipping > landed_cost_usd:
                category_type = "MAGNET"
                is_cashback_eligible = False
            elif selection_threshold >= 4.0:
                category_type = "REBATE"
                is_cashback_eligible = True
            elif selection_threshold >= 1.5:
                category_type = "NORMAL"
                is_cashback_eligible = False
            else:
                logger.warning(f"⏭️ Skipping: Threshold {selection_threshold:.2f} < 1.5 for {product_id_1688}")
                return
            
        # v4.5 Mirror Sync
        mirror_data = {}
        if data.get("raw_json"):
            try:
                mirror_data = MirrorExtractor.extract(data["raw_json"])
            except Exception as e:
                logger.error(f"Mirror Extraction failed: {e}")

        strategy_tag = data.get("strategy_tag", "IDS_FOLLOWING")
        
        # v4.6 Multi-Sourcing simulation
        backup_suppliers = data.get("backup_suppliers", [])

        raw_images = mirror_data.get("mirror_assets", {}).get("hero", {}).get("gallery") or data.get("images", [])
        clean_images = [self._ensure_absolute_url(img) for img in raw_images if img]
        
        main_image = clean_images[0] if clean_images else None
        fingerprint = self._calculate_visual_fingerprint(main_image)
        
        # v4.6.7: Visual Deduplication Gate
        if fingerprint:
            dupe = self.db.query(CandidateProduct).filter_by(visual_fingerprint=fingerprint).first()
            if not dupe:
                dupe = self.db.query(Product).filter_by(visual_fingerprint=fingerprint).first()
            if dupe:
                logger.info(f"⏭️ Visual Duplicate Detected (Fingerprint: {fingerprint}). Skipping.")
                return

        enriched_preview = await self.translate_and_enrich({
            "title": mirror_data.get("title") or data.get("name"),
            "description": data.get("description_zh"),
            "category": data.get("category")
        }, strategy_tag)
        
        candidate = CandidateProduct(
            product_id_1688=product_id_1688,
            status="new",
            discovery_source=strategy_tag,
            discovery_evidence=data.get("discovery_evidence", {}),
            title_zh=mirror_data.get("title") or data.get("name"),
            description_zh=data.get("description_zh", ""),
            images=clean_images,
            
            # v4.5 "Three-in-One" Asset Mapping
            attributes=mirror_data.get("attributes", []),
            variants_raw=mirror_data.get("variants_raw", []),
            mirror_assets=mirror_data.get("mirror_assets", {}),
            structural_data=mirror_data.get("structural_data", {}),
            
            cost_cny=cost_cny,
            comp_price_usd=comp_price,
            estimated_sale_price=target_sale_price,
            profit_ratio=roi,
            
            supplier_id_1688=data.get("supplier_id_1688"),
            supplier_info={
                **(mirror_data.get("structural_data", {}).get("trust", {})),
                "backup_suppliers": backup_suppliers
            },
            
            title_en_preview=enriched_preview["title_en"],
            description_en_preview=enriched_preview["description_en"],
            desire_hook=enriched_preview.get("desire_hook"),
            desire_logic=enriched_preview.get("desire_logic"),
            desire_closing=enriched_preview.get("desire_closing"),
            category=data.get("category", "General"),
            audit_notes=data.get("audit_notes"),
            visual_fingerprint=fingerprint,
            
            # v4.6.8: Comparison Pricing
            amazon_price=amazon_price,
            ebay_price=data.get("ebay_price"),
            amazon_compare_at_price=amazon_compare_at,
            ebay_compare_at_price=data.get("ebay_compare_at_price"),
            market_comparison_url=market_url,
            
            # v5.4 Brute-force Tiering
            category_type=category_type,
            product_category_label=category_type, # v8.5 labeling
            is_cashback_eligible=is_cashback_eligible,
            
            # v4.7.1: Sourcing Provenance
            source_platform=data.get("source_platform", "1688"),
            source_url=data.get("source_url", f"https://detail.1688.com/offer/{product_id_1688}.html")
        )
        
        self.db.add(candidate)
        self.db.commit()
        self.db.refresh(candidate)
        
        return candidate
        
        # v5.3: Automated CJ Sourcing for Alibaba products
        if candidate.source_platform == "ALIBABA" and candidate.source_url:
            try:
                sourcing_res = await self.cj_service.create_sourcing(
                    source_url=candidate.source_url,
                    product_name=candidate.title_en_preview or candidate.title_zh,
                    product_image=candidate.images[0] if candidate.images else ""
                )
                if sourcing_res.get("success"):
                    # Store sourcing ID for polling/tracking
                    if not candidate.structural_data:
                        candidate.structural_data = {}
                    candidate.structural_data["cj_sourcing_id"] = sourcing_res["data"]
                    self.db.commit()
                    logger.info(f"✅ CJ Sourcing Created for Candidate {candidate.id}: ID {sourcing_res['data']}")
            except Exception as e:
                logger.error(f"❌ CJ Sourcing failed for candidate {candidate.id}: {e}")

        # v4.7.2: Auto-Sniff Alibaba Alternative immediately after ingestion
        try:
            await self.find_alibaba_alternative(candidate.id)
        except Exception as e:
            logger.error(f"Auto-Sniff Alibaba failed for candidate {candidate.id}: {e}")
            
        return candidate

    async def _generate_b2b_keywords(self, candidate: CandidateProduct) -> List[str]:
        """v4.7.3: Use AI to generate B2B-optimized search keywords for Alibaba.com."""
        import json
        system_prompt = (
            "You are a global sourcing expert. Given 1688 product data, generate a list of 3-5 "
            "precise English keywords optimized for searching on Alibaba.com. "
            "Focus on technical specs, materials, and industry standard names. "
            "Output format: JSON list of strings."
        )
        human_content = f"Title (ZH): {candidate.title_zh}\nAttributes: {json.dumps(candidate.attributes, ensure_ascii=False)}"
        
        try:
            messages = [SystemMessage(content=system_prompt), HumanMessage(content=human_content)]
            response = await self.llm.ainvoke(messages)
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            return json.loads(content)
        except Exception as e:
            logger.error(f"Failed to generate B2B keywords: {e}")
            return [candidate.title_en_preview or candidate.title_zh]

    async def find_alibaba_alternative(self, candidate_id: int):
        """
        v4.7.2: Intelligent Sniffer for Alibaba.com Alternatives.
        v4.7.3: Semantic Search + Arbitrage Logic + Configuration Driven.
        """
        import json
        from decimal import Decimal
        candidate = self.db.query(CandidateProduct).filter_by(id=candidate_id).first()
        if not candidate:
            return None
        
        # v4.7.3 Rule 1: Prioritization from Config
        min_trend_score = self.config_service.get("min_trend_score", 85)
        trend_score = (candidate.discovery_evidence or {}).get("trend_score", 0) if candidate.discovery_evidence else 0
        if trend_score < min_trend_score:
            logger.info(f"⏭️ Skipping Alibaba sniff for Candidate {candidate_id} (Trend Score {trend_score} < {min_trend_score}).")
            return None

        # v4.7.3 Rule 3: Semantic Search Optimization
        logger.info(f"🧠 Generating B2B SEO keywords for: {candidate.title_zh[:30]}...")
        keywords = await self._generate_b2b_keywords(candidate)
        search_query = keywords[0] if keywords else (candidate.title_en_preview or candidate.title_zh)
        
        # v4.7.3 Simulation: Finding a Gold Supplier on Alibaba
        # In real-world, we'd use alibaba.search.product API
        mock_alibaba_price = float(candidate.cost_cny) / 6.5 * 1.05 # Simulate Alibaba USD price slightly higher than 1688 cost
        mock_alibaba_data = {
            "supplier": "Guangzhou Precision Artisan Ltd.",
            "years": 5,
            "gold_supplier": True,
            "trade_assurance": True,
            "price_usd": round(mock_alibaba_price, 2),
            "source_url": f"https://www.alibaba.com/product-detail/precision-artisan-{candidate.id}.html"
        }

        # v4.7.3 Rule 2: Arbitrage Logic + Configuration Driven
        threshold = float(self.config_service.get("arbitrage_threshold", 0.15))
        require_gold = self.config_service.get("require_gold_supplier", True)
        min_years = self.config_service.get("min_supplier_years", 2)
        
        # Landed cost simulation (1688 Cost + Shipping Buffer)
        landed_cost_usd = float(candidate.cost_cny) / 6.5 * 1.25 # Simulation: 25% shipping/ops buffer
        
        # Arbitrage check: Alibaba Price < (1688 Landed Cost * (1 + Threshold))
        # But for simplification, we check if Alibaba price is actually CHEAPER than buying from 1688 and consolidating
        is_arbitrage_worth = mock_alibaba_data["price_usd"] < (landed_cost_usd * (1 + threshold))
        
        # Supplier Integrity Check
        is_integrity_pass = (not require_gold or mock_alibaba_data["gold_supplier"]) and \
                           (mock_alibaba_data["years"] >= min_years)

        if is_arbitrage_worth and is_integrity_pass:
            candidate.alibaba_comparison_price = mock_alibaba_data["price_usd"]
            candidate.backup_source_url = mock_alibaba_data["source_url"]
            
            # v4.7.3: Set source metadata for the "Arbitrage Alternative" UI
            meta = candidate.discovery_evidence or {}
            meta["arbitrage_recommend"] = True
            meta["alibaba_supplier"] = mock_alibaba_data
            candidate.discovery_evidence = meta
            
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(candidate, "discovery_evidence")
            
            logger.info(f"✅ Arbitrage Opportunity Found for Candidate {candidate_id}: Alibaba {mock_alibaba_data['price_usd']} USD")
        else:
            # Still record that we checked but no better alternative found
            candidate.alibaba_comparison_price = -1.0 
            
        self.db.add(candidate)
        self.db.commit()
        return True

    async def approve_candidate(self, candidate_id: int):
        candidate = self.db.query(CandidateProduct).filter_by(id=candidate_id).first()
        if not candidate or candidate.status != "new":
            return False

        candidate.status = "reviewing"
        self.db.commit()

        try:
            clean_images = [self._ensure_absolute_url(img) for img in candidate.images if img]
            
            # v4.5: Pass the Three-in-One blocks directly
            product = await self.sync_product(
                source_product_id=candidate.product_id_1688,
                comp_price_usd=candidate.comp_price_usd,
                cost_cny=candidate.cost_cny,
                title=candidate.title_zh,
                strategy_tag=candidate.discovery_source,
                category_type=candidate.category_type or "PROFIT",
                is_cashback_eligible=candidate.is_cashback_eligible if candidate.is_cashback_eligible is not None else True,
                
                variants_override=candidate.variants_raw,
                images_override=clean_images,
                attributes=candidate.attributes,
                mirror_assets=candidate.mirror_assets,
                structural_data=candidate.structural_data,
                
                desire_hook=candidate.desire_hook,
                desire_logic=candidate.desire_logic,
                desire_closing=candidate.desire_closing,
                visual_fingerprint=candidate.visual_fingerprint,
                # v4.7.1 Sourcing mapping
                source_platform=candidate.source_platform,
                source_url=candidate.source_url,
                # v4.6.8 Platform Comparison
                amazon_price=candidate.amazon_price,
                ebay_price=candidate.ebay_price,
                amazon_compare_at_price=candidate.amazon_compare_at_price,
                ebay_compare_at_price=candidate.ebay_compare_at_price,
                
                # v7.0: Truth Engine & Industrial Arbitrage
                amazon_link=candidate.amazon_link,
                hot_rating=candidate.hot_rating,
                profit_ratio=candidate.profit_ratio,
                entry_tag=candidate.entry_tag,
                platform_tag=candidate.platform_tag,
                cj_pid=candidate.cj_pid,
                category_id=candidate.category_id,
                is_test_product=candidate.is_test_product,
                packing_weight=candidate.packing_weight,
                product_weight=candidate.product_weight,
                inventory_total=candidate.inventory_total,
                entry_code=candidate.entry_code,
                entry_name=candidate.entry_name,
                product_props=candidate.product_props,
                is_melted=candidate.is_melted,
                melt_reason=candidate.melt_reason,
                
                # cj_fields_matrix.csv fields
                category_name=candidate.category_name,
                primary_image=candidate.primary_image,
                variant_images=candidate.variant_images,
                detail_images_html=candidate.detail_images_html,
                sell_price=candidate.sell_price,
                variant_sell_price=candidate.variant_sell_price,
                dimensions_display=candidate.dimensions_display,
                weight_display=candidate.weight_display,
                freight_fee=candidate.freight_fee,
                shipping_days=candidate.shipping_days,
                warehouse_anchor=candidate.warehouse_anchor,
                variant_sku=candidate.variant_sku,
                variant_key=candidate.variant_key
            )

            from app.services.sync_shopify import SyncShopifyService
            sync_service = SyncShopifyService()
            sync_service.sync_to_shopify(product)

            # v4.6.6: Notion Backup (Ops Hub)
            try:
                notion = NotionService(self.config_service.get_api_key("NOTION_TOKEN"))
                await notion.add_product_to_pool({
                    "name": product.title_zh,
                    "status": "审核通过",
                    "url_1688": f"https://detail.1688.com/offer/{product.product_id_1688}.html",
                    "id_1688": product.product_id_1688,
                    "cost_cny": product.original_price,
                    "comp_price": product.sale_price / 0.6, # Back-calculate guess
                    "category": product.category,
                    "shopify_id": product.shopify_id,
                    "reason_team": f"IDS Strategy: {product.strategy_tag}",
                    "description_zh": product.description_zh
                })
                logger.info(f"✅ Product {product.id} backed up to Notion.")
            except Exception as ne:
                logger.error(f"⚠️ Notion Backup failed: {ne}")

            candidate.status = "synced"
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Approval failed: {e}")
            self.db.rollback()
            try:
                candidate = self.db.query(CandidateProduct).filter_by(id=candidate_id).first()
                if candidate:
                    candidate.status = "new"
                    candidate.audit_notes = f"Sync Error: {str(e)[:200]}"
                    self.db.commit()
            except:
                pass
            raise e
