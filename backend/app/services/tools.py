import os
import httpx
from typing import List, Dict, Any, Optional
from langchain_core.tools import tool
from backend.app.services.vector_search import vector_search_service
from backend.app.core.config import settings

@tool
async def product_search(query: str, image_url: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Search for products in the local 1688/Shopify database using semantic and visual search.
    Best for finding specific items already synced to our platform.
    """
    # Get embedding for the query
    vector = await vector_search_service.get_embedding(text=query, image_url=image_url)
    # Search in Qdrant
    results = vector_search_service.search(vector=vector, limit=5)
    return results

@tool
async def web_search(query: str) -> List[Dict[str, Any]]:
    """
    Search the web using Exa to find trending products, market prices, or supplier information.
    Best for broad research or finding items not yet in our database.
    """
    url = "https://api.exa.ai/search"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "x-api-key": settings.EXA_API_KEY
    }
    payload = {
        "query": query,
        "useAutoprompt": True,
        "numResults": 5,
        "type": "neural"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
        except Exception as e:
            return [{"error": str(e)}]

@tool
async def alibaba_search(query: str) -> List[Dict[str, Any]]:
    """
    Search for products directly on Alibaba/1688. 
    Returns a list of potential products with their 1688 IDs and prices.
    Best for sourcing new items from China.
    """
    # This is a placeholder for actual Alibaba/1688 search API
    # In a real scenario, this would call ElimAPI or similar.
    # For now, we return mock data that matches the expected schema.
    return [
        {
            "id": f"1688_{i}",
            "title": f"Alibaba Product {i} for {query}",
            "price_cny": 50.0 + i * 10,
            "url": f"https://detail.1688.com/offer/{123456 + i}.html",
            "image": "https://sc01.alicdn.com/kf/Abafe897f47f7466ab81e2fd5d542336ce.png"
        } for i in range(1, 4)
    ]

@tool
async def get_order_status(order_id: str) -> Dict[str, Any]:
    """
    Retrieve the current status of a Shopify order and its 1688 fulfillment status.
    """
    # Placeholder for Shopify + 1688 order tracking
    return {
        "order_id": order_id,
        "status": "fulfilled",
        "tracking_number": "YT1234567890",
        "carrier": "Yanwen",
        "estimated_delivery": "2026-04-10",
        "items": [
            {"title": "Smart AI Glasses", "quantity": 1}
        ]
    }
