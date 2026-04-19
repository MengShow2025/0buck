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
from langchain_openai import ChatOpenAI
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
        
        # Initialize AI with Admin-configurable key (OpenRouter)
        self.llm = ChatOpenAI(
            model="anthropic/claude-3.5-sonnet",
            api_key=self.config_service.get_api_key("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
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
                            "name": mirror.get("structural_data", {}).get("trust", {}).get("supplier_name")
                        }
                    }
            except Exception as e:
                logger.warning(f"ICBU API call failed for {source_product_id}: {e}")

        # 3. Fallback to CJ Dropshipping
        try:
            cj_data = await self.cj_service.get_product_details(source_product_id)
            if cj_data:
                return cj_data
        except:
            pass
            
        return {}

    async def approve_candidate(self, candidate_id: int) -> bool:
        """
        v8.5 Truth Engine: Convert candidate to live product with 1:1 asset lineage.
        """
        from sqlalchemy.exc import IntegrityError
        try:
            # Phase 1: DB transaction
            candidate = (
                self.db.query(CandidateProduct)
                .filter_by(id=candidate_id)
                .with_for_update()
                .first()
            )
            if not candidate:
                return False
                
            if candidate.status == "synced":
                return True
                
            cost = float(candidate.cost_usd or 0)
            freight = float(candidate.freight_fee or 0)
            total_landed = cost + freight
            sale_price = float(candidate.sell_price or 0)
            if candidate.product_category_label != "MAGNET" and sale_price < total_landed:
                raise ValueError(
                    f"Circuit Breaker: Sale Price ${sale_price} < Landed Cost ${total_landed}"
                )
                
            product = (
                self.db.query(Product)
                .filter_by(product_id_1688=candidate.product_id_1688)
                .first()
            )
            
            if product is None:
                product = Product(
                    product_id_1688=candidate.product_id_1688,
                    title_zh=candidate.title_zh,
                    title_en=candidate.title_en or candidate.title_en_preview,
                    description_zh=candidate.description_zh,
                    description_en=candidate.description_en or candidate.description_en_preview,
                    original_price=candidate.cost_cny,
                    source_cost_usd=candidate.cost_usd,
                    sale_price=candidate.sell_price,
                    compare_at_price=candidate.amazon_price,
                    amazon_link=candidate.amazon_link,
                    amazon_list_price=candidate.amazon_list_price,
                    amazon_sale_price=candidate.amazon_sale_price,
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
                    melting_reason=candidate.melt_reason,
                    category_name=candidate.category_name,
                    primary_image=candidate.primary_image,
                    variant_images=candidate.variant_images,
                    detail_images_html=candidate.detail_images_html,
                    sell_price=candidate.sell_price,
                    variant_sell_price=candidate.variant_sell_price,
                    dimensions_display=candidate.dimensions_display,
                    weight_display=candidate.weight_display,
                    cost_usd=candidate.cost_usd,
                    amazon_shipping_cost=candidate.amazon_shipping_cost,
                    truth_body=candidate.truth_body,
                    freight_fee=candidate.freight_fee,
                    shipping_days=candidate.shipping_days,
                    warehouse_anchor=candidate.warehouse_anchor,
                    variant_sku=candidate.variant_sku,
                    variant_key=candidate.variant_key,
                )
                self.db.add(product)
                self.db.flush()
        
            # Phase 2: External side-effect
            from app.services.sync_shopify import SyncShopifyService
            sync_service = SyncShopifyService()
            sync_service.sync_to_shopify(product)
            
            # Phase 3: Mark as synced
            candidate.status = "synced"
            self.db.commit()
                
            return True
            
        except IntegrityError:
            logger.warning("approve_candidate hit duplicate product insert, fallback to idempotent path")
            self.db.rollback()
            return True
        except Exception as e:
            logger.error(f"Approval failed: {e}")
            self.db.rollback()
            raise e

    async def _call_1688_api(self, method: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Mocked 1688 API call for v8.5 Truth Engine"""
        # In production, this would use httpx and your App Key 507580
        return None

    def _format_candidate_as_details(self, candidate: CandidateProduct) -> Dict[str, Any]:
        """Convert a CandidateProduct record into the standard detail dictionary format"""
        return {
            "id": candidate.product_id_1688,
            "title": candidate.title_zh,
            "description": candidate.description_zh,
            "price": candidate.cost_cny,
            "images": candidate.images,
            "variants": candidate.variants_raw,
            "attributes": candidate.attributes,
            "source_platform": candidate.source_platform
        }
