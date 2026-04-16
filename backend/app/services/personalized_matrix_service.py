import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.genai_client import generate_text
from app.models.butler import UserMemoryFact, UserButlerProfile, PersonaTemplate
from app.models import Product
from app.core.checkout_block_reason import (
    CHECKOUT_BLOCK_REASON_INACTIVE,
    CHECKOUT_BLOCK_REASON_MISSING_PRICE,
    CHECKOUT_BLOCK_REASON_NOT_PUBLISHED,
    CHECKOUT_BLOCK_REASON_UNKNOWN,
)
from app.models.product import CandidateProduct
from app.services.vector_search import vector_search_service
from app.services.butler_service import ButlerService
from app.services.cj_normalize import extract_cj_images, first_image, extract_cj_dimensions, extract_cj_weights, format_dimensions_cm, format_weight_g

logger = logging.getLogger(__name__)

class PersonalizedMatrixService:
    """
    v3.2 Vortex Predictive Entry Service.
    Links LTM (Memory) + IDS Strategy (Traffic) + UI Greeting.
    """

    def __init__(self, db: Session):
        self.db = db
        self.model_enabled = bool(settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY)

    async def get_personalized_discovery(self, user_id: int, user_country: str = "US", limit: int = 10) -> Dict[str, Any]:
        """
        v8.0 Truth Protocol: Warehouse-Aware Discovery.
        Fetches a 2x5 matrix of products, filtered by user_country to ensure local stock.
        """
        # 1. Fetch Top 3 LTM facts to use as search query
        facts = []
        try:
            # Check if UserMemoryFact table exists and query it
            facts = self.db.query(UserMemoryFact).filter(
                UserMemoryFact.user_id == user_id,
                UserMemoryFact.is_archived == False
            ).order_by(UserMemoryFact.confidence.desc()).limit(3).all()
        except Exception as e:
            # If table is missing or query fails, just log and continue with empty facts
            logger.warning(f"LTM Memory facts unavailable (table may be missing): {e}")
            facts = []

        search_query = " ".join([f"{f.key}: {f.value}" for f in facts]) if facts else "popular trending products"
        
        # 2. Vector Search for matching products (Fall back to DB if search fails or is empty)
        products = []
        try:
            vector = await vector_search_service.get_embedding(text=search_query)
            products = vector_search_service.search(vector=vector, limit=limit)
        except Exception as e:
            logger.error(f"Vector search failed for personalized matrix: {e}")
            products = []
            
        if not products:
            # Fallback: candidate_products (official staged table) first
            try:
                # v8.0 Truth Protocol: Only show local warehouse items or CN
                # We prioritize items that match the user's country or are CN (global)
                query = (
                    self.db.query(CandidateProduct)
                    .filter(CandidateProduct.status.in_(["approved", "published", "audited"]))
                )
                
                # Multi-Warehouse Anchor logic: filter where warehouse_anchor contains user_country or is CN
                if user_country:
                    from sqlalchemy import or_
                    query = query.filter(or_(
                        CandidateProduct.warehouse_anchor.ilike(f"%{user_country}%"),
                        CandidateProduct.warehouse_anchor == "CN",
                        CandidateProduct.warehouse_anchor == None
                    ))

                candidates = (
                    query.order_by(CandidateProduct.created_at.desc())
                    .limit(limit)
                    .all()
                )
                products = []
                for c in candidates:
                    cand_images = c.images if isinstance(c.images, list) else []
                    image_url = cand_images[0] if cand_images else ""
                    title = c.title_en_preview or c.title_zh or f"Candidate #{c.id}"
                    price = float(c.estimated_sale_price or c.comp_price_usd or 0.0)
                    original_price = float(c.comp_price_usd or c.estimated_sale_price or price or 0.0)
                    products.append(
                        {
                            "id": c.id,
                            "name": title,
                            "title": title,
                            "price": price,
                            "original_price": original_price,
                            "image": image_url,
                            "supplier": "0Buck Candidate",
                            "category": c.category or "General",
                            "attributes": c.attributes or {},
                            "structural_data": {
                                "status": c.status,
                                "source_platform": c.source_platform,
                                "source_url": c.source_url,
                                "market_url": c.market_comparison_url,
                            },
                        }
                    )
            except Exception as e:
                logger.warning(f"Candidate products fallback unavailable: {e}")
                products = []

        if not products:
            # Fallback: CJ raw products (cj_raw_products) if present
            try:
                cj_rows = self.db.execute(
                    text(
                        """
                        SELECT id, cj_pid, raw_json, title_en, source_url
                        FROM cj_raw_products
                        ORDER BY created_at DESC
                        LIMIT :limit
                        """
                    ),
                    {"limit": limit},
                ).mappings().all()

                products = []
                for r in cj_rows:
                    raw = r.get("raw_json") or {}
                    if isinstance(raw, str):
                        try:
                            raw = json.loads(raw)
                        except Exception:
                            raw = {}

                    title = r.get("title_en") or raw.get("title") or raw.get("productName") or raw.get("name") or "CJ Product"
                    images = extract_cj_images(raw)
                    image_url = first_image(images)

                    dims = format_dimensions_cm(extract_cj_dimensions(raw))
                    packing_w, product_w = extract_cj_weights(raw)
                    weight = format_weight_g(packing_w, product_w)

                    price = 0.0
                    for key in ("sale_price", "price", "sellPrice", "productPrice", "sellPriceUsd"):
                        v = raw.get(key)
                        if v is not None:
                            try:
                                price = float(v)
                                break
                            except Exception:
                                pass
                    if price == 0.0 and isinstance(raw.get("variants"), list) and raw.get("variants"):
                        v0 = raw.get("variants")[0]
                        if isinstance(v0, dict):
                            for key in ("price", "sellPrice", "sale_price"):
                                vv = v0.get(key)
                                if vv is not None:
                                    try:
                                        price = float(vv)
                                        break
                                    except Exception:
                                        pass

                    products.append(
                        {
                            "id": int(r.get("id")),
                            "name": title,
                            "title": title,
                            "price": price,
                            "original_price": price,
                            "image": image_url,
                            "supplier": "CJ",
                            "category": "General",
                            "attributes": {},
                            "structural_data": {
                                "cj_pid": r.get("cj_pid"),
                                "source_url": r.get("source_url"),
                                "dimensions": dims,
                                "weight": weight,
                            },
                        }
                    )
            except Exception as e:
                logger.warning(f"CJ raw products fallback unavailable: {e}")
                products = []

        if not products:
            # Secondary fallback to DB products if CJ raw products are empty/unavailable
            try:
                db_products = self.db.query(Product).filter(Product.is_active == True).limit(limit).all()
                products = []
                for p in db_products:
                    image_url = ""
                    if p.images and isinstance(p.images, list) and len(p.images) > 0:
                        image_url = p.images[0]

                    products.append({
                        "id": p.id,
                        "name": p.title_en or p.title_zh or "Unknown Product",
                        "title": p.title_en or p.title_zh or "Unknown Product",
                        "price": p.sale_price or 0.0,
                        "original_price": p.sale_price or 0.0,
                        "image": image_url,
                        "supplier": "0Buck Verified",
                        "category": "General",
                        "attributes": {},
                        "structural_data": {}
                    })
            except Exception as e:
                logger.error(f"DB fallback products failed: {e}")
                products = []

        # 3. Generate Personalized Greeting (The Easter Egg)
        greeting = ""
        best_match = None
        if products and facts and self.model_enabled:
            best_match = products[0]
            greeting = await self._generate_greeting(user_id, best_match, facts)

        products = self._annotate_checkout_ready(products)

        return {
            "products": products,
            "butler_greeting": greeting or f"Boss, I've found a great deal just for you!",
            "highlight_index": 0 if best_match else -1,
            "persona_id": self._get_user_persona_id(user_id)
        }

    def _annotate_checkout_ready(self, products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Mark discovery cards that are currently eligible for create-order path.
        Conservative rule: product must exist in `products`, active, and have positive sale_price.
        """
        if not products:
            return products
        ids = []
        for p in products:
            try:
                pid = int(p.get("id"))
                if pid > 0:
                    ids.append(pid)
            except Exception:
                continue
        if not ids:
            return products

        status_map: Dict[int, Dict[str, Any]] = {}
        try:
            rows = (
                self.db.query(Product.id, Product.is_active, Product.sale_price)
                .filter(Product.id.in_(ids))
                .all()
            )
            for r in rows:
                pid = int(r[0])
                is_active = bool(r[1])
                sale_price = float(r[2] or 0)
                checkout_ready = is_active and sale_price > 0
                reason = None
                if not checkout_ready:
                    reason = CHECKOUT_BLOCK_REASON_INACTIVE if not is_active else CHECKOUT_BLOCK_REASON_MISSING_PRICE
                status_map[pid] = {"ready": checkout_ready, "reason": reason}
        except Exception as e:
            logger.warning(f"Checkout readiness annotation failed: {e}")

        for p in products:
            try:
                pid = int(p.get("id"))
                status = status_map.get(pid)
                if status:
                    p["checkout_ready"] = bool(status["ready"])
                    p["checkout_block_reason"] = status["reason"]
                else:
                    p["checkout_ready"] = False
                    p["checkout_block_reason"] = CHECKOUT_BLOCK_REASON_NOT_PUBLISHED
            except Exception:
                p["checkout_ready"] = False
                p["checkout_block_reason"] = CHECKOUT_BLOCK_REASON_UNKNOWN
        return products

    def _get_user_persona_id(self, user_id: int) -> str:
        try:
            profile = self.db.query(UserButlerProfile).filter_by(user_id=user_id).first()
            if not profile:
                return "default"
            return profile.active_persona_id or "default"
        except Exception:
            return "default"

    async def _generate_greeting(self, user_id: int, product: Dict[str, Any], facts: List[UserMemoryFact]) -> str:
        """
        Generates a personalized greeting based on user facts and the recommended product.
        Uses the user's active L2 Persona.
        """
        # Fetch L2 Persona Template
        persona_id = self._get_user_persona_id(user_id)
        template = self.db.query(PersonaTemplate).filter_by(id=persona_id).first()
        
        style_prompt = template.style_prompt if template else "You are a professional Butler."

        prompt = (
            f"System:\n{style_prompt}\n\n"
            "You are a concise shopping butler. Write a short greeting to the user based on their facts and the product. "
            "Return plain text only.\n\n"
            f"User facts:\n{json.dumps([{ 'key': f.key, 'value': f.value } for f in facts], ensure_ascii=False)}\n\n"
            f"Product:\n{json.dumps(product, ensure_ascii=False)}\n"
        )

        try:
            resp = await generate_text(model="gemini-2.5-flash", contents=prompt, temperature=0.4)
            return (resp.text or "").strip()
        except Exception as e:
            logger.warning(f"Personalized greeting generation failed: {e}")
            return ""
