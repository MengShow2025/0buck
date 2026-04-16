
import os
import json
import logging
import hashlib
import time
import httpx
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class AliExpressService:
    def __init__(self, app_key: str = None, app_secret: str = None):
        self.app_key = app_key or os.getenv("ALIEXPRESS_APP_KEY")
        self.app_secret = app_secret or os.getenv("ALIEXPRESS_APP_SECRET")
        self.base_url = "https://api-sg.aliexpress.com/sync"
        self.session_key = os.getenv("ALIEXPRESS_SESSION_KEY") # Usually for buyer actions

    def _generate_sign(self, params: Dict[str, Any]) -> str:
        """TOP API Signature Generation."""
        sorted_keys = sorted(params.keys())
        query_string = self.app_secret
        for key in sorted_keys:
            query_string += f"{key}{params[key]}"
        query_string += self.app_secret
        return hashlib.md5(query_string.encode('utf-8')).hexdigest().upper()

    async def _call_api(self, method: str, biz_params: Dict[str, Any]) -> Dict[str, Any]:
        """Generic call to AE Dropshipping API."""
        if not self.app_key or not self.app_secret:
            logger.error("❌ AliExpress API Credentials missing.")
            return {"error": "Credentials missing"}

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
        params = {
            "method": method,
            "app_key": self.app_key,
            "timestamp": timestamp,
            "format": "json",
            "v": "2.0",
            "sign_method": "md5",
            **biz_params
        }
        params["sign"] = self._generate_sign(params)

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(self.base_url, data=params)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"❌ AE API Error: {response.status_code} - {response.text}")
                    return {"error": f"HTTP {response.status_code}"}
            except Exception as e:
                logger.error(f"❌ AE API Connection Error: {e}")
                return {"error": str(e)}

    async def get_product_details(self, product_id: str) -> Dict[str, Any]:
        """aliexpress.ds.product.get - Fetches structured product data."""
        biz_params = {
            "product_id": product_id,
            "target_currency": "USD",
            "target_language": "EN"
        }
        return await self._call_api("aliexpress.ds.product.get", biz_params)

    async def calculate_freight(self, product_id: str, country_code: str, quantity: int = 1) -> List[Dict[str, Any]]:
        """aliexpress.ds.freight.query - Fetches real-time shipping costs."""
        biz_params = {
            "product_id": product_id,
            "country_code": country_code,
            "product_num": quantity,
            "send_goods_country_code": "CN" # Default from China, but can be US, PL, etc.
        }
        res = await self._call_api("aliexpress.ds.freight.query", biz_params)
        # Process result to find Choice or Local Warehouse shipping
        return res.get("aliexpress_ds_freight_query_response", {}).get("result", {}).get("ae_logistics_info_list", [])

    async def detect_local_warehouse(self, product_id: str, target_countries: List[str]) -> Dict[str, Any]:
        """Detects if product has local warehouse shipping for target countries."""
        results = {}
        for country in target_countries:
            shipping_options = await self.calculate_freight(product_id, country)
            # Logic: Look for shipping options where 'send_goods_country_code' == country
            # or where delivery time is exceptionally short (e.g. < 7 days)
            results[country] = {
                "has_local": any(opt.get("send_goods_country_code") == country for opt in shipping_options),
                "options": shipping_options
            }
        return results

    async def search_ds_products(self, keyword: str, sort_by: str = "priceAsc") -> List[Dict[str, Any]]:
        """aliexpress.ds.text.search - Finds top-selling items."""
        biz_params = {
            "keywords": keyword,
            "sort": sort_by,
            "page_size": 20,
            "target_currency": "USD"
        }
        res = await self._call_api("aliexpress.ds.text.search", biz_params)
        return res.get("aliexpress_ds_text_search_response", {}).get("result", {}).get("products", [])

    async def validate_shipping_address(self, address_dict: Dict[str, Any]) -> Dict[str, Any]:
        """aliexpress.ds.shipping.address.check - Verifies if address is deliverable."""
        # Simulated logic for now as API might be restricted
        logger.info(f"📍 Validating Shipping Address: {address_dict.get('zip_code')}")
        return {"status": "valid", "deliverable": True, "validated_by": "0Buck AI Auditor"}

    async def create_mock_order(self, product_id: str, address_dict: Dict[str, Any], quantity: int = 1) -> Dict[str, Any]:
        """aliexpress.ds.order.create (Mock) - Simulates order creation and pre-order checks."""
        # 1. Address Check
        addr_res = await self.validate_shipping_address(address_dict)
        if addr_res.get("status") != "valid":
            return {"error": "Invalid Shipping Address"}

        # 2. Freight Check
        freight_info = await self.calculate_freight(product_id, address_dict.get("country_code", "US"), quantity)
        best_option = next((opt for opt in freight_info if opt.get("service_name") == "AliExpress Choice"), None)
        
        # 3. Final Simulation Result
        return {
            "order_id": f"MOCK-AE-{int(time.time())}",
            "product_id": product_id,
            "cost": 12.50, # Example
            "freight": best_option.get("freight_cost", 0) if best_option else 3.99,
            "status": "pre_order_verified",
            "message": "System Ready for Auto-Purchase"
        }

