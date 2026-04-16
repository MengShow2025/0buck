import logging
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class CategoryMappingService:
    """
    v8.5: Refined Category Mapping for multi-category waterfall display.
    Uses LLM to map generic product titles to structured 0Buck categories.
    """
    def __init__(self):
        self.api_key = settings.ANTHROPIC_API_KEY
        self.base_url = settings.ANTHROPIC_BASE_URL
        
    async def map_to_refined_category(self, product_title: str, attributes: list) -> Dict[str, str]:
        """
        Maps a product to a refined category ID and Name.
        Example mapping: 
        - Category ID: "HOME_SMART_SECURITY"
        - Category Name: "Smart Home Security"
        """
        if not self.api_key:
            return {"category_id": "GENERAL", "category_name": "General Products"}
            
        attr_text = ", ".join([f"{a.get('label')}: {a.get('value')}" for a in attributes[:5]])
        
        prompt = f"""
        Assign a refined category to this product:
        Title: {product_title}
        Attributes: {attr_text}
        
        Task: 
        1. Choose a Category ID (UPPER_CASE_SNAKE) - e.g., KITCHEN_GADGETS, TECH_ACCESSORIES, OUTDOOR_GEAR.
        2. Choose a friendly Category Name - e.g., Kitchen Gadgets, Tech Accessories.
        
        Output ONLY a JSON object:
        {{
            "category_id": "...",
            "category_name": "..."
        }}
        """
        
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 100,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                api_url = f"{self.base_url.rstrip('/')}/v1/messages"
                resp = await client.post(api_url, json=payload, headers=headers)
                resp.raise_for_status()
                result = resp.json()
                import json
                raw_json = result["content"][0]["text"].strip()
                if "```json" in raw_json:
                    raw_json = raw_json.split("```json")[1].split("```")[0].strip()
                return json.loads(raw_json)
        except Exception as e:
            logger.error(f"❌ Category Mapping Error: {e}")
            return {"category_id": "GENERAL", "category_name": "General Products"}

category_mapping_service = CategoryMappingService()
