import logging
import httpx
import hmac
import hashlib
import time
import json
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class MabangService:
    """
    v5.3: Mabang ERP Integration for 1688 Sourcing & Fulfillment.
    Updated to V2 Gateway: https://gwapi.mabangerp.com/api/v2
    """
    def __init__(self, token: str = None, app_key: str = None):
        self.token = token or settings.MABANG_TOKEN # Used as Developer Key for HMAC
        self.app_key = app_key or settings.MABANG_APP_KEY
        self.base_url = "https://gwapi.mabangerp.com/api/v2"
        self.version = "1"

    def _generate_v2_signature(self, body_str: str) -> str:
        """Calculate HMAC-SHA256 signature for V2."""
        return hmac.new(
            self.token.encode('utf-8'),
            body_str.encode('utf-8'),
            hashlib.sha256
        ).hexdigest().upper()

    async def _post(self, api_method: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generic POST helper for Mabang V2 API."""
        payload = {
            "api": api_method,
            "appkey": self.app_key,
            "data": data,
            "timestamp": int(time.time()),
            "version": self.version
        }
        
        body_str = json.dumps(payload, separators=(',', ':'))
        signature = self._generate_v2_signature(body_str)
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": signature,
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.base_url, headers=headers, content=body_str, timeout=30.0)
                # print(f"DEBUG MABANG V2: Status: {response.status_code} | Text: {response.text[:200]}")
                response.raise_for_status()
                result = response.json()
                if result.get("code") != "000":
                    logger.warning(f"⚠️ Mabang API {api_method} returned error: {result.get('message')}")
                return result
            except Exception as e:
                logger.error(f"❌ Mabang API {api_method} failed: {e}")
                return {"code": "999", "message": str(e)}

    async def get_1688_product_detail(self, url_1688: str) -> Dict[str, Any]:
        """Fetch 1688 product info via Mabang's 1688 Sourcing interface."""
        return await self._post("get-1688-product-list", {"url": url_1688})

    async def create_1688_purchase_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a 1688 purchase order in Mabang."""
        return await self._post("add-1688-order", order_data)

    async def get_inventory_sku(self, sku: str) -> Dict[str, Any]:
        """Check inventory status for a specific SKU in Mabang."""
        return await self._post("get-Order-Info", {"sku": sku})
