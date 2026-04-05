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
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def get_personalized_discovery(self, user_id: int, limit: int = 10) -> Dict[str, Any]:
        """
        Fetches a 2x5 matrix of products, with the first item personalized 
        based on user LTM facts.
        """
        # 1. Fetch Top 3 LTM facts to use as search query
        facts = self.db.query(UserMemoryFact).filter(
            UserMemoryFact.user_id == user_id,
            UserMemoryFact.is_archived == False
        ).order_by(UserMemoryFact.confidence.desc()).limit(3).all()

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
            # Fallback to DB products if vector search is empty or failed
            db_products = self.db.query(Product).filter(Product.is_active == True).limit(limit).all()
            products = [{"id": p.id, "title": p.title_en, "price": p.sale_price, "image": p.images[0] if p.images else ""} for p in db_products]

        # 3. Generate Personalized Greeting (The Easter Egg)
        greeting = ""
        best_match = None
        if products and facts:
            best_match = products[0]
            greeting = await self._generate_greeting(user_id, best_match, facts)

        return {
            "products": products,
            "butler_greeting": greeting,
            "highlight_index": 0 if best_match else -1,
            "persona_id": self._get_user_persona_id(user_id)
        }

    def _get_user_persona_id(self, user_id: int) -> str:
        profile = self.db.query(UserButlerProfile).filter_by(user_id=user_id).first()
        return profile.active_persona_id if profile else "default"

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
