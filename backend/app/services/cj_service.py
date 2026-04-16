import logging
import httpx
from typing import List, Dict, Any, Optional
from decimal import Decimal
from app.core.config import settings

from app.utils.proxy_manager import get_proxy_for_country

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
        # v6.1.4: Try to get OAuth token from MCP first
        try:
            import subprocess
            import json
            print("   DEBUG: Attempting to fetch CJ OAuth token via MCP...")
            result = subprocess.run(
                ["accio-mcp-cli", "call", "get_cj_access_token", "--raw"],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                # Find the JSON part in case there's extra output
                output = result.stdout.strip()
                json_start = output.find('{')
                json_end = output.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    data = json.loads(output[json_start:json_end])
                    token = data.get("accessToken") or data.get("access_token")
                    if token:
                        print("   DEBUG: Successfully fetched CJ OAuth token via MCP.")
                        return token
        except Exception as e:
            print(f"   DEBUG: MCP token fetch failed: {e}")

        print(f"   DEBUG: Falling back to legacy CJ Auth for {self.email}...")
        url = f"{self.BASE_URL}/authentication/getAccessToken"
        payload = {
            "email": self.email,
            "password": self.api_key
        }
        for attempt in range(3):
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload)
                data = response.json()
                print(f"   DEBUG: Token result: {data.get('success')} (Attempt {attempt+1})")
                if data.get("success"):
                    return data["data"]["accessToken"]
                if "Too Many Requests" in data.get("message", ""):
                    import asyncio
                    await asyncio.sleep(2.0)
                    continue
                raise Exception(f"Failed to get CJ access token: {data.get('message')}")
        raise Exception(f"Failed to get CJ access token after 3 attempts.")

    async def get_categories(self) -> List[Dict[str, Any]]:
        """Fetch all CJ categories."""
        url = f"{self.BASE_URL}/product/getCategory"
        headers = await self._get_headers()
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 429:
                raise Exception("CJ API 429: Too Many Requests (Rate Limited)")
            data = response.json()
            if not data.get("success"):
                logger.warning(f"CJ API categories failed: {data.get('message')}")
                return []
            return data.get("data", [])

    async def get_product_detail(self, pid: str) -> Optional[Dict[str, Any]]:
        """Fetch full product detail from CJ with 429 backoff."""
        url = f"{self.BASE_URL}/product/query"
        headers = await self._get_headers()
        
        # v6.1.5: Retry with 10s+ interval on 429
        for attempt in range(3):
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    response = await client.get(url, headers=headers, params={"pid": pid})
                    if response.status_code == 429:
                        print(f"   ⚠️ CJ API Detail 429 (Attempt {attempt+1}). Sleeping 12s...")
                        import asyncio
                        await asyncio.sleep(12.0)
                        continue
                    
                    data = response.json()
                    return data.get("data") if data.get("success") else None
                except Exception as e:
                    if attempt == 2: raise e
                    import asyncio
                    await asyncio.sleep(2.0)
        return None

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
            
        # v6.1.6: Retry with 15s interval on 429
        for attempt in range(3):
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    print(f"   DEBUG: Fetching listV2 for category {category_id} (Attempt {attempt+1})...")
                    response = await client.get(url, headers=headers, params=params)
                    
                    if response.status_code == 429:
                        print(f"   ⚠️ CJ API Search 429 (Rate Limit). Sleeping 15s...")
                        import asyncio
                        await asyncio.sleep(15.0)
                        continue
                    
                    data = response.json()
                    print(f"   DEBUG: CJ Response success: {data.get('success')}")
                    
                    # v5.4 Fixed parsing for listV2: data['data']['content'][0]['productList']
                    res_data = data.get("data")
                    if res_data is None:
                        # Handle case where success is True but data is null, or success is False
                        if not data.get("success"):
                            logger.warning(f"CJ API search failed: {data.get('message')}")
                        return []
                        
                    content = res_data.get("content", [])
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
                except Exception as e:
                    if attempt == 2: raise e
                    import asyncio
                    await asyncio.sleep(3.0)
        return []

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
            
            # 取价格范围的最小值（最低拿货价，最保守成本估算）
            if " -- " in str(cost_usd_raw):
                cost_usd = float(str(cost_usd_raw).split(" -- ")[0].strip())
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
                amazon_results = await web_search.ainvoke(f"{name} price on amazon.com")
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

    async def get_freight_calculate(self, products: List[Dict[str, Any]], start_country: str = "CN", end_country: str = "US", zip_code: str = None) -> List[Dict[str, Any]]:
        """
        Get available logistics methods and costs.
        v8.5 Patch: Uses Residential IP Proxy matching the end_country.
        """
        url = f"{self.BASE_URL}/logistic/freightCalculate"
        headers = await self._get_headers()
        payload = {
            "startCountryCode": start_country,
            "endCountryCode": end_country,
            "products": products
        }
        if zip_code:
            payload["zip"] = zip_code
            
        # v8.5 Patch: IP Geo-Match via ProxyManager
        proxies = get_proxy_for_country(end_country)
            
        async with httpx.AsyncClient(proxies=proxies) as client:
            try:
                if proxies:
                    logger.info(f"🌐 [Geo-Match] Using {end_country} Proxy for Freight Calculation")
                response = await client.post(url, headers=headers, json=payload, timeout=20.0)
                data = response.json()
                if data.get("success"):
                    return data.get("data", [])
            except Exception as e:
                logger.error(f"❌ Freight Calculation Proxy Error: {e}")
            return []

    async def calculate_shipping_and_tax(self, pid: str, vid: str, country_code: str, province: str = None, city: str = None, zip_code: str = None) -> Dict[str, Any]:
        """
        v7.0: Industrial Shipping & Tax Precision.
        Calculates the exact freight fee and taxes that the user must pay.
        """
        # 1. Calculate Freight
        products = [{"pid": pid, "vid": vid, "quantity": 1}]
        methods = await self.get_freight_calculate(products, end_country=country_code, zip_code=zip_code)
        
        if not methods:
            # Fallback to a standard rate if calculation fails
            return {"freight": 10.0, "tax": 0.0, "method": "Standard Shipping", "days": "7-15"}
            
        # Select the best method (lowest price for decent speed, or first one)
        # Sort by price then time
        # Filtering for "Sensitive" or "Standard" methods if desired
        methods.sort(key=lambda x: (float(x.get("logisticFee", 999)), x.get("maxTransitTime", 999)))
        best = methods[0]
        
        freight = float(best.get("logisticFee", 10.0))
        days = f"{best.get('minTransitTime', 7)}-{best.get('maxTransitTime', 15)}"
        method_name = best.get("logisticName", "Standard Shipping")
        
        # 2. Tax Calculation (Place-holder logic or CJ API if available)
        # Currently, if CJ charges us tax, we pass it to the user.
        # Most dropshipping to US under de minimis (800 USD) has no import tax.
        tax = 0.0
        
        return {
            "freight": freight,
            "tax": tax,
            "total_extra": freight + tax,
            "method": method_name,
            "days": days
        }

    async def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a CJ order (Shopping API V2.0)."""
        url = f"{self.BASE_URL}/shopping/order/createOrderV3"
        headers = await self._get_headers()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=order_data)
            return response.json()

    async def add_to_cart(self, cj_order_ids: List[str]) -> Dict[str, Any]:
        url = f"{self.BASE_URL}/shopping/order/addCart"
        headers = await self._get_headers()
        payload = {"cjOrderIdList": cj_order_ids}
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            return response.json()

    async def pay_order(self, shipment_order_id: str, pay_id: str) -> Dict[str, Any]:
        """Pay for a CJ shipment order using balance."""
        url = f"{self.BASE_URL}/shopping/pay/payBalanceV2"
        headers = await self._get_headers()
        payload = {
            "shipmentOrderId": shipment_order_id,
            "payId": pay_id
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            return response.json()
