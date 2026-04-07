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
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import logging
import os

logger = logging.getLogger(__name__)

class SupplyChainService:
    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)
        
        # Fetch API keys from DB (Admin-configurable) or Settings
        self.api_key = self.config_service.get_api_key("ALIBABA_1688_API_KEY")
        self.api_base_url = settings.ALIBABA_1688_API_URL
        
        # Initialize AI with Admin-configurable key
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=self.config_service.get_api_key("GOOGLE_API_KEY"),
            temperature=0.7
        )

    async def fetch_product_details(self, source_product_id: str) -> Dict[str, Any]:
        """
        Fetch product details from the supply library.
        v4.5: Support real 1688 API + Candidate Pool fallback.
        """
        # 1. Check if we have this in the candidate pool already
        candidate = self.db.query(CandidateProduct).filter_by(product_id_1688=source_product_id).first()
        if candidate:
            return self._format_candidate_as_details(candidate)

        # 2. Try Real 1688 API
        if source_product_id and not source_product_id.startswith("sim_"):
            try:
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
                            "name": mirror.get("structural_data", {}).get("trust", {}).get("factory_name"),
                            "rating": mirror.get("structural_data", {}).get("social", {}).get("rating", 4.5)
                        }
                    }
            except Exception as e:
                logger.error(f"1688 API Fetch failed for {source_product_id}: {e}")

        # 3. Mock response fallback for simulations
        return {
            "id": source_product_id,
            "title": "Supply Library Item",
            "description": "Product description from the source library.",
            "price": 50.0,
            "images": [],
            "variants": [],
            "category": "General",
            "supplier": {"id": "test_supplier", "name": "Test Factory", "rating": 4.5}
        }

    async def _call_1688_api(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """v4.6: Real 1688 API Gateway Integration"""
        if not self.api_key or not self.api_base_url:
            logger.warning("1688 API Configuration missing. Falling back to simulation.")
            return None
            
        async with httpx.AsyncClient() as client:
            try:
                # Add authentication headers/params as per 1688 API spec
                # This is a generic implementation using common patterns
                api_params = {
                    "method": method,
                    "api_key": self.api_key,
                    "timestamp": datetime.now().isoformat(),
                    **params
                }
                response = await client.get(self.api_base_url, params=api_params, timeout=15.0)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"1688 API Error: {response.status_code} - {response.text}")
                return None
            except Exception as e:
                logger.error(f"1688 API Call failed: {e}")
                return None

    def _format_candidate_as_details(self, candidate: CandidateProduct) -> Dict[str, Any]:
        def safe_json_load(data, default=[]):
            if isinstance(data, (list, dict)): return data
            try:
                return json.loads(data) if data else default
            except (json.JSONDecodeError, TypeError):
                return default

        return {
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
                **(candidate.supplier_info if isinstance(candidate.supplier_info, dict) else safe_json_load(candidate.supplier_info, {}))
            }
        }

    def calculate_price(self, cost_cny: float, comp_price_usd: float = None, category_type: str = "PROFIT") -> Dict[str, Any]:
        """Internal logic for profit analysis (v4.6.8 Hybrid Pricing)"""
        config = ConfigService(self.db)
        sale_ratio = config.get("sale_price_ratio", 0.6)
        strike_ratio = config.get("compare_at_price_ratio", 0.95)
        
        multiplier = 4.0 if category_type == "PROFIT" else 2.0
        
        return calculate_final_price(
            cost_cny=cost_cny, 
            exchange_rate=settings.EXCHANGE_RATE, 
            multiplier=multiplier,
            comp_price_usd=comp_price_usd,
            sale_price_ratio=sale_ratio,
            compare_at_price_ratio=strike_ratio
        )

    async def translate_and_enrich(self, raw_data: Dict[str, Any], strategy: str) -> Dict[str, str]:
        """AI Translation & Marketing Polish (v4.0 Desire Engine)"""
        system_prompt = (
            "You are a master of consumer psychology and cross-border e-commerce marketing. "
            "Your task is to transform raw 1688 product data into high-conversion English marketing copy. "
            "Focus on decoding 'Brand Tax' and highlighting factory-direct value.\n\n"
            "Output format must be a valid JSON with the following keys:\n"
            "- title_en: A compelling, SEO-friendly English title.\n"
            "- description_en: A benefit-oriented description emphasizing quality and logic.\n"
            "- desire_hook: (The Hook) A short, punchy sentence that zaps a user's pain point or loss aversion.\n"
            "- desire_logic: (The Logic) A paragraph that demystifies cost, explains why this is Artisan quality, and justifies the 1/4 retail price.\n"
            "- desire_closing: (The Closing) A call-to-action that creates a sense of ritual, contract, or disciplined reward.\n"
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
            logger.error(f"Desire Engine enrichment failed: {e}")
            return {
                "title_en": f"Global {raw_data.get('title')}",
                "description_en": f"Enriched description for {raw_data.get('title')}",
                "desire_hook": "Pain point hook...",
                "desire_logic": "Value logic...",
                "desire_closing": "Closing contract..."
            }

    async def sync_product(self, source_product_id: str, comp_price_usd: float = None, cost_cny: float = None, title: str = None, strategy_tag: str = "IDS_FOLLOWING", category_type: str = "PROFIT", is_cashback_eligible: bool = None, variants_override: List[Dict] = None, images_override: List[str] = None, attributes: List[Dict] = None, logistics_data: Dict = None, mirror_assets: Dict = None, structural_data: Dict = None, desire_hook: str = None, desire_logic: str = None, desire_closing: str = None, visual_fingerprint: str = None, source_platform: str = "1688", source_url: str = None, backup_source_url: str = None):
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
        
        # v4.7.1: Sourcing Provenance
        if source_platform:
            raw_data["source_platform"] = source_platform
        if source_url:
            raw_data["source_url"] = source_url
        if backup_source_url:
            raw_data["backup_source_url"] = backup_source_url

        pricing_result = self.calculate_price(raw_data["price"], comp_price_usd or 0, category_type)
        enriched_data = await self.translate_and_enrich(raw_data, strategy_tag)

        # Ensure Supplier exists
        supplier = self.db.query(Supplier).filter_by(supplier_id_1688=raw_data["supplier"]["id"]).first()
        if not supplier:
            location_province = raw_data["supplier"].get("province", "Guangdong")
            location_city = raw_data["supplier"].get("city", "Shenzhen")
            warehouse = find_closest_warehouse(location_province, location_city)
            
            supplier = Supplier(
                supplier_id_1688=raw_data["supplier"]["id"],
                name=raw_data["supplier"].get("name") or raw_data["supplier"].get("factory_name", "Unknown Factory"),
                rating=raw_data["supplier"].get("rating", 4.5),
                location_province=location_province,
                location_city=location_city,
                warehouse_anchor=warehouse["name"]
            )
            self.db.add(supplier)
            self.db.commit()
            self.db.refresh(supplier)
            
        product = self.db.query(Product).filter_by(product_id_1688=source_product_id).first()
        if not product:
            product = Product(product_id_1688=source_product_id)
            self.db.add(product)
            
        product.title_zh = raw_data.get("title")
        product.title_en = enriched_data["title_en"]
        product.description_zh = raw_data.get("description")
        product.description_en = enriched_data["description_en"]
        
        product.desire_hook = desire_hook or enriched_data.get("desire_hook")
        product.desire_logic = desire_logic or enriched_data.get("desire_logic")
        product.desire_closing = desire_closing or enriched_data.get("desire_closing")
        
        product.original_price = candidate.cost_cny
        product.source_cost_usd = pricing_result.get("source_cost_usd")
        product.sale_price = pricing_result.get("final_price_usd")
        product.compare_at_price = pricing_result.get("compare_at_price")
        
        # v4.6.8: Platform Comparison
        product.amazon_price = candidate.amazon_price
        product.ebay_price = candidate.ebay_price
        product.amazon_compare_at_price = candidate.amazon_compare_at_price
        product.ebay_compare_at_price = candidate.ebay_compare_at_price
        
        product.is_reward_eligible = pricing_result.get("is_reward_eligible", True)
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
        If API fails or key is missing, falls back to simulation mode.
        """
        signals = []
        
        # 1. Attempt Real 1688 Search API
        search_results = await self._call_1688_api("alibaba.search.product", {"keyword": keyword})
        if search_results and "products" in search_results:
            for p in search_results["products"][:10]: # Process top 10
                signals.append({
                    "id_1688": p.get("id"),
                    "name": p.get("title"),
                    "cost_cny": p.get("price"),
                    "comp_price": float(p.get("price")) * 8.0, # Guessing competitor multiplier
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
                    # v4.6.8: Simulate multi-platform prices
                    cost_cny = float(mirror["variants_raw"][0]["price"]) if mirror.get("variants_raw") else 100.0
                    amazon_price = 800.0 + i*100
                    ebay_price = 750.0 + i*100
                    
                    signals.append({
                        "id_1688": f"sim_{i+1}_{mirror.get('product_id', 'unknown')}",
                        "name": mirror.get("title", f"Test Product {i+1}"),
                        "supplier_id_1688": f"sim_supplier_{i+1}",
                        "cost_cny": cost_cny,
                        "comp_price": amazon_price, # Main competitor price
                        "amazon_price": amazon_price,
                        "ebay_price": ebay_price,
                        "amazon_compare_at_price": amazon_price * 1.2,
                        "ebay_compare_at_price": ebay_price * 1.15,
                        "raw_json": raw_json,
                        "strategy_tag": "IDS_FOLLOWING"
                    })

        for s in signals:
            await self.ingest_to_candidate_pool(s)
        
        return len(signals)

    async def ingest_to_candidate_pool(self, data: Dict[str, Any]):
        product_id_1688 = data.get("id_1688")
        if not product_id_1688: return

        exists = self.db.query(CandidateProduct).filter_by(product_id_1688=product_id_1688).first()
        if exists: return
        
        prod_exists = self.db.query(Product).filter_by(product_id_1688=product_id_1688).first()
        if prod_exists: return

        cost_cny = float(data.get("cost_cny", 0.0))
        comp_price = float(data.get("comp_price", 0.0))
        amazon_price = float(data.get("amazon_price", comp_price))
        ebay_price = float(data.get("ebay_price", comp_price))
        
        pricing = self.calculate_price(cost_cny, comp_price, data.get("category_type", "PROFIT"))
        
        # v4.5 Mirror Sync
        mirror_data = {}
        if data.get("raw_json"):
            try:
                mirror_data = MirrorExtractor.extract(data["raw_json"])
            except Exception as e:
                logger.error(f"Mirror Extraction failed: {e}")

        strategy_tag = data.get("strategy_tag", "IDS_FOLLOWING")
        
        # v4.6 Multi-Sourcing simulation
        # In production, this would call 1688 Image Search API
        backup_suppliers = data.get("backup_suppliers", [
            {"name": "Factory Backup A", "price_cny": cost_cny * 0.98, "rating": 4.8},
            {"name": "Factory Backup B", "price_cny": cost_cny * 1.02, "rating": 4.7}
        ])

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
            estimated_sale_price=pricing.get("sale_price"),
            profit_ratio=pricing.get("sale_price") / pricing.get("cost_usd_buffered") if pricing.get("cost_usd_buffered") else 0,
            
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
            # v4.6.7: Visual Fingerprint mapping
            visual_fingerprint=fingerprint,
            
            # v4.6.8: Comparison Pricing
            amazon_price=amazon_price,
            ebay_price=ebay_price,
            amazon_compare_at_price=data.get("amazon_compare_at_price", amazon_price * 1.5),
            ebay_compare_at_price=data.get("ebay_compare_at_price", ebay_price * 1.5),
            
            # v4.7.1: Sourcing Provenance
            source_platform=data.get("source_platform", "1688"),
            source_url=data.get("source_url", f"https://detail.1688.com/offer/{product_id_1688}.html")
        )
        
        self.db.add(candidate)
        self.db.commit()
        self.db.refresh(candidate)
        
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
                category_type="PROFIT",
                is_cashback_eligible=True,
                
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
                source_url=candidate.source_url
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
