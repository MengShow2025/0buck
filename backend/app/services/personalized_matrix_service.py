import json
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import google.generativeai as genai

from app.core.config import settings
from app.models.butler import UserMemoryFact, UserButlerProfile, PersonaTemplate
from app.models import Product
from app.services.vector_search import vector_search_service
from app.services.butler_service import ButlerService

logger = logging.getLogger(__name__)

class PersonalizedMatrixService:
    """
    v3.2 Vortex Predictive Entry Service.
    Links LTM (Memory) + IDS Strategy (Traffic) + UI Greeting.
    """

    def __init__(self, db: Session):
        self.db = db
        if settings.GOOGLE_API_KEY:
            try:
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                self.model = genai.GenerativeModel('gemini-2.0-flash')
            except Exception as e:
                logger.error(f"Gemini configuration failed: {e}")
                self.model = None
        else:
            logger.warning("GOOGLE_API_KEY not found in settings, Gemini features disabled.")
            self.model = None

    async def get_personalized_discovery(self, user_id: int, user_country: str = "US", mode: str = "local", limit: int = 20) -> Dict[str, Any]:
        """
        v8.0 Vortex Predictive Entry Service with Geofencing.
        Links LTM (Memory) + IDS Strategy (Traffic) + UI Greeting.
        """
        # 1. Fetch Top 3 LTM facts to use as search query
        facts = []
        try:
            facts = self.db.query(UserMemoryFact).filter(
                UserMemoryFact.user_id == user_id,
                UserMemoryFact.is_archived == False
            ).order_by(UserMemoryFact.confidence.desc()).limit(3).all()
        except Exception as e:
            logger.warning(f"LTM Memory facts unavailable: {e}")
            facts = []

        search_query = " ".join([f"{f.key}: {f.value}" for f in facts]) if facts else "popular trending products"
        
        # 2. Query Products with Geofencing
        try:
            query = self.db.query(Product).filter(
                Product.is_active == True,
                Product.sale_price >= 0,
                Product.images != None,
                Product.images != '[]'
            )
            
            if mode == "local":
                # v8.5 SOP: Local warehouse products ONLY visible to local users.
                # Global products (CN) visible to everyone.
                from sqlalchemy import or_
                query = query.filter(
                    or_(
                        Product.warehouse_anchor.ilike(f"%{user_country}%"),
                        Product.warehouse_anchor == "CN",
                        Product.warehouse_anchor.is_(None)
                    )
                )
            
            # Order by sales volume and recency
            db_products = query.order_by(Product.sales_volume.desc(), Product.updated_at.desc()).limit(limit).all()
            
            products = []
            for p in db_products:
                imgs = p.images
                if isinstance(imgs, str):
                    try: imgs = json.loads(imgs)
                    except: imgs = []
                
                if not imgs or not isinstance(imgs, list) or len(imgs) == 0:
                    continue
                    
                products.append({
                    "id": p.id,
                    "title": p.title_en or p.title_zh or "Unknown Product",
                    "price": float(p.sale_price),
                    "image": imgs[0],
                    "description": p.body_html or p.description_en or "",
                    "category": p.category or "General",
                    "warehouse_anchor": p.warehouse_anchor or "CN",
                    "product_category_label": p.product_category_label or "NORMAL",
                    "admin_tags": p.admin_tags or [],
                    "handle": p.shopify_product_handle
                })
        except Exception as e:
            logger.error(f"Discovery query failed: {e}")
            products = []

        # 3. Generate Personalized Greeting (The Easter Egg)
        greeting = ""
        best_match = None
        if products and facts and self.model:
            best_match = products[0]
            greeting = await self._generate_greeting(user_id, best_match, facts)

        return {
            "vortex_featured": products[:5],
            "category_feeds": [
                {
                    "category": "Zero-Cost Magnets" if mode == "local" else "Global Best Sellers",
                    "products": [p for p in products if p.get("product_category_label") == "MAGNET"] or products[5:15]
                }
            ],
            "butler_greeting": greeting or f"Boss, I've found some great {mode} deals for you in {user_country}!",
            "highlight_index": 0 if best_match else -1,
            "persona_id": self._get_user_persona_id(user_id)
        }

    def _get_user_persona_id(self, user_id: int) -> str:
        try:
            profile = self.db.query(UserButlerProfile).filter_by(user_id=user_id).first()
            if profile and profile.active_persona_id:
                return profile.active_persona_id
            return "default"
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
        user_facts_str = ", ".join([f"{f.key}: {f.value}" for f in facts])
        
        prompt = (
            f"SYSTEM ROLE: {style_prompt}\n"
            f"USER FACTS: {user_facts_str}\n"
            f"RECOMMENDED PRODUCT: {product.get('title')} (Price: ${product.get('price')})\n\n"
            "TASK: Generate a very short, warm, and proactive welcome message (1-2 sentences). "
            "Address the user by their LTM facts if appropriate (e.g., 'Old Wang' or 'Boss'). "
            "Mention WHY you put this product in the first position based on their memory. "
            "Mention it is a [TRAFFIC] deal with a great price. "
            "Respond in the tone defined by the SYSTEM ROLE."
        )

        try:
            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Failed to generate butler greeting: {e}")
            return f"Boss, I've found a great deal on {product.get('title')} just for you!"
