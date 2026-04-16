import logging
import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class RainforestService:
    """
    v7.1 Truth Engine: Amazon Data Integration via Rainforest API.
    Provides verified MSRP, Sale Price, and Ratings.
    """
    BASE_URL = "https://api.rainforestapi.com/request"

    def __init__(self, api_key: str = None):
        self.api_key = api_key or getattr(settings, "RAINFOREST_API_KEY", None)

    async def get_amazon_product(self, asin: str = None, url: str = None) -> Optional[Dict[str, Any]]:
        """
        Fetch Amazon product details by ASIN or URL.
        """
        if not self.api_key:
            logger.error("❌ Rainforest API Key not configured.")
            return None

        params = {
            "api_key": self.api_key,
            "type": "product",
            "amazon_domain": "amazon.com"
        }
        
        if asin:
            params["asin"] = asin
        elif url:
            params["url"] = url
        else:
            logger.error("❌ Either ASIN or URL must be provided to Rainforest API.")
            return None

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(self.BASE_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("request_info", {}).get("success"):
                        return data.get("product")
                    else:
                        logger.warning(f"⚠️ Rainforest API request failed: {data.get('request_info', {}).get('message')}")
                elif response.status_code == 429:
                    logger.error("❌ Rainforest API Rate Limited (429).")
                else:
                    logger.error(f"❌ Rainforest API Error {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"💥 Rainforest API Exception: {e}")
        
        return None

    async def get_amazon_reviews(self, asin: str) -> Optional[List[Dict[str, Any]]]:
        """
        v8.5: Fetch Amazon reviews to extract Pain Points.
        """
        if not self.api_key:
            return None

        params = {
            "api_key": self.api_key,
            "type": "reviews",
            "amazon_domain": "amazon.com",
            "asin": asin,
            "sort_by": "most_recent"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(self.BASE_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("reviews", [])
            except Exception as e:
                logger.error(f"💥 Rainforest Reviews Exception: {e}")
        
        return None
        """
        Extracts sale price and list price (MSRP) from Rainforest product data.
        """
        if not product_data:
            return {}

        # 1. Sale Price (Current BuyBox Price)
        buybox = product_data.get("buybox_winner", {})
        sale_price = buybox.get("price", {}).get("value")
        
        # 2. Shipping Fee
        shipping_fee = buybox.get("shipping", {}).get("value", 0.0)
        
        # 3. List Price (MSRP / Strikethrough)
        list_price = product_data.get("list_price", {}).get("value")
        if not list_price:
            # Fallback to strike-through price if list_price is missing
            list_price = buybox.get("list_price", {}).get("value")
        
        # 4. Fallback: If no list price, use sale price as the truth anchor
        if not list_price:
            list_price = sale_price

        return {
            "amazon_sale_price": float(sale_price) if sale_price else 0.0,
            "amazon_list_price": float(list_price) if list_price else 0.0,
            "amazon_shipping_fee": float(shipping_fee) if shipping_fee else 0.0,
            "rating": float(product_data.get("rating", 0.0))
        }
