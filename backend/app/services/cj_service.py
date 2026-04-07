import logging
import httpx
from typing import List, Dict, Any, Optional
from decimal import Decimal
from app.core.config import settings

logger = logging.getLogger(__name__)

class CJDropshippingService:
    BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1"

    def __init__(self):
        self.email = settings.CJ_EMAIL
        self.api_key = settings.CJ_API_KEY
        self._token = None

    async def _get_headers(self) -> Dict[str, str]:
        if not self._token:
            self._token = await self._get_access_token()
        return {
            "CJ-Access-Token": self._token,
            "Content-Type": "application/json"
        }

    async def _get_access_token(self) -> str:
        url = f"{self.BASE_URL}/authentication/getAccessToken"
        payload = {
            "email": self.email,
            "password": self.api_key
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload)
            data = response.json()
            if data.get("success"):
                return data["data"]["accessToken"]
            raise Exception(f"Failed to get CJ access token: {data.get('message')}")

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Fetch all CJ categories."""
        url = f"{self.BASE_URL}/product/category"
        headers = await self._get_headers()
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            data = response.json()
            return data.get("data", []) if data.get("success") else []

    async def search_products(self, keyword: str = None, page: int = 1, size: int = 20, only_cj_owned: bool = False, category_id: str = None) -> List[Dict[str, Any]]:
        url = f"{self.BASE_URL}/product/listV2"
        headers = await self._get_headers()
        
        # v5.3: Using the exact parameter names that worked in cat_search test
        params = {
            "pageNumber": page,
            "pageSize": size
        }
        if keyword:
            params["keyWord"] = keyword
        if category_id:
            params["categoryId"] = category_id
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            data = response.json()
            # print(f"DEBUG CJ Response: {data}")
            
            # v5.4 Fixed parsing for listV2: data['data']['content'][0]['productList']
            content = data.get("data", {}).get("content", [])
            products = []
            if content:
                products = content[0].get("productList", [])
            
            if not products and (keyword or category_id):
                # Fallback to list (V1)
                url_v1 = f"{self.BASE_URL}/product/list"
                params_v1 = {"page": page, "size": size}
                if keyword: params_v1["keyWord"] = keyword
                if category_id: params_v1["categoryId"] = category_id
                
                resp_v1 = await client.get(url_v1, headers=headers, params=params_v1)
                data_v1 = resp_v1.json()
                products = data_v1.get("data", {}).get("list", []) if data_v1.get("success") else []

            if only_cj_owned:
                filtered = []
                for p in products:
                    name = p.get("nameEn") or p.get("productName") or ""
                    is_choice = "CJ's Choice" in name
                    inv = p.get("warehouseInventoryNum") or p.get("inventory") or 0
                    try:
                        inv_count = int(inv)
                    except:
                        inv_count = 0
                    
                    if is_choice or inv_count > 100:
                        filtered.append(p)
                return filtered
                
            return products

    async def process_safe_path_candidates(self, keyword: str) -> List[Dict[str, Any]]:
        logger.info(f"🚀 Starting CJ 'Safe-Path' scan for: {keyword}")
        cj_products = await self.search_products(keyword, only_cj_owned=True)
        if not cj_products:
            logger.warning(f"⚠️ No safe-path items found on CJ for: {keyword}")
            return []
            
        candidates = []
        for p in cj_products[:5]:
            name = p.get("nameEn") or p.get("productName")
            pid = p.get("id") or p.get("pid")
            cost_usd_raw = p.get("sellPrice") or p.get("productSellPrice") or "0"
            
            if " -- " in str(cost_usd_raw):
                cost_usd = float(str(cost_usd_raw).split(" -- ")[1])
            else:
                cost_usd = float(str(cost_usd_raw))

            freight = 8.0 
            try:
                if pid:
                    estimates = await self.get_freight_estimate(pid, "US")
                    if estimates:
                        freight = float(estimates[0].get("logisticFee", 8.0))
            except: pass

            landed_cost = cost_usd + freight
            
            from app.services.tools import web_search
            import re
            market_data = {"amazon_price": None, "amazon_compare_at_price": None}
            try:
                amazon_results = await web_search(f"{name} price on amazon.com")
                for res in amazon_results:
                    if isinstance(res, dict):
                        text = f"{res.get('title', '')} {res.get('text', '')}"
                        price_match = re.search(r"\$\s?([\d,]+(\.\d{1,2})?)", text)
                        if price_match and not market_data["amazon_price"]:
                            market_data["amazon_price"] = float(price_match.group(1).replace(",", ""))
                        list_match = re.search(r"(?:List Price|Was|MSRP):\s*\$\s?([\d,]+(\.\d{1,2})?)", text, re.I)
                        if list_match and not market_data["amazon_compare_at_price"]:
                            market_data["amazon_compare_at_price"] = float(list_match.group(1).replace(",", ""))
                        if market_data["amazon_price"]: break
            except: pass

            anchor = market_data["amazon_compare_at_price"] or market_data["amazon_price"]
            if not anchor: continue
                
            target_price = anchor * 0.6
            roi = target_price / landed_cost if landed_cost > 0 else 0
            
            if roi >= 1.5:
                candidates.append({
                    "product_name": name,
                    "cj_pid": pid,
                    "landed_cost": landed_cost,
                    "amazon_anchor": anchor,
                    "target_price": target_price,
                    "roi": round(roi, 2),
                    "image": p.get("bigImage") or p.get("productImage")
                })
        return candidates

    async def get_freight_estimate(self, pid: str, country_code: str = "US") -> List[Dict[str, Any]]:
        url = f"{self.BASE_URL}/logistic/freightCalculate"
        headers = await self._get_headers()
        payload = {"pid": pid, "countryCode": country_code}
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            data = response.json()
            return data.get("data", []) if data.get("success") else []
