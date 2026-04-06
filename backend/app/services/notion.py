import httpx
import json
from typing import Dict, Any, List, Optional
from app.core.config import settings

class NotionService:
    def __init__(self, token: Optional[str] = None):
        self.token = token or getattr(settings, "NOTION_TOKEN", "")
        print(f"DEBUG: NotionService init with token: {self.token[:10]}...")
        self.base_url = "https://api.notion.com/v1"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }

    async def _request(self, method: str, path: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        # Ensure path starts with a slash
        if not path.startswith("/"):
            path = "/" + path
            
        async with httpx.AsyncClient(timeout=30.0, trust_env=False) as client:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=self.headers,
                json=data
            )
            if response.status_code >= 400:
                print(f"DEBUG Notion Error {response.status_code}: {response.text}")
            response.raise_for_status()
            return response.json()

    async def create_database(self, parent_page_id: str, title: str, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new database within a parent page."""
        data = {
            "parent": {"type": "page_id", "page_id": parent_page_id},
            "title": [{"type": "text", "text": {"content": title}}],
            "properties": properties
        }
        return await self._request("POST", "/databases", data)

    async def add_page_to_database(self, database_id: str, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Adds a new row/page to a database."""
        data = {
            "parent": {"type": "database_id", "database_id": database_id},
            "properties": properties
        }
        return await self._request("POST", "/pages", data)

    async def search(self, query: str = "", filter_type: str = "page") -> Dict[str, Any]:
        """Search for pages or databases."""
        data = {
            "query": query,
            "filter": {"value": filter_type, "property": "object"}
        }
        return await self._request("POST", "/search", data)

    async def get_database_contents(self, database_id: str) -> List[Dict[str, Any]]:
        """Queries all pages from a database."""
        results = []
        has_more = True
        next_cursor = None
        
        while has_more:
            payload = {"start_cursor": next_cursor} if next_cursor else {}
            response = await self._request("POST", f"/databases/{database_id}/query", payload)
            results.extend(response.get("results", []))
            has_more = response.get("has_more", False)
            next_cursor = response.get("next_cursor")
            
        return results

    async def update_database_properties(self, database_id: str, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Updates a database's properties (schema)."""
        return await self._request("PATCH", f"/databases/{database_id}", {"properties": properties})

    async def get_viral_signals(self) -> List[Dict[str, Any]]:
        """Fetches candidates from the '0Buck: 爆点信号捕捉' (Viral Signals) database."""
        database_id = None
        search_results = await self.search("0Buck: 爆点信号捕捉", filter_type="database")
        if search_results.get("results"):
            for db in search_results["results"]:
                title_list = db.get("title", [])
                if title_list and title_list[0].get("plain_text") == "0Buck: 爆点信号捕捉":
                    database_id = db["id"]
                    break
        
        if not database_id:
            # Fallback to hardcoded ID found in check_viral_db.py
            database_id = "3372ab9f-0c63-81db-a9f8-c3c2a676fb2b"

        print(f"DEBUG: get_viral_signals using database_id: {database_id}")
        pages = await self.get_database_contents(database_id)
        print(f"DEBUG: get_viral_signals found {len(pages)} pages raw.")
        
        parsed_signals = []
        for page in pages:
            props = page.get("properties", {})
            
            def get_val(prop_names: List[str]):
                for name in prop_names:
                    p = props.get(name, {})
                    if not p: continue
                    ptype = p.get("type")
                    if ptype == "title":
                        return p["title"][0]["text"]["content"] if p["title"] else ""
                    elif ptype == "rich_text":
                        return p["rich_text"][0]["text"]["content"] if p["rich_text"] else ""
                    elif ptype == "number":
                        return p["number"]
                    elif ptype == "select":
                        return p["select"]["name"] if p["select"] else ""
                    elif ptype == "url":
                        return p["url"]
                return None

            status = get_val(["处理状态"])
            print(f"DEBUG: Page {page['id'][:8]} status: {status}")
            # Only pick "待处理" or "候选款"
            if status not in ["待处理", "候选款"]:
                continue

            parsed_signals.append({
                "page_id": page["id"],
                "name": get_val(["趋势主题"]),
                "growth": get_val(["趋势热度"]) or 200, # Default if missing
                "platforms": [get_val(["来源平台"])] if get_val(["来源平台"]) else ["TikTok"],
                "url": get_val(["原始链接"]),
                "status": status
            })
            
        return parsed_signals

    async def get_product_pool(self) -> List[Dict[str, Any]]:
        """Fetches items from the '0Buck: 全球运营中控 (v3.0)' database."""
        database_id = "3372ab9f-0c63-8128-91cb-da0163c32085" # Hardcoded fallback v3.0 ID
        
        # Check if we can search for it first, otherwise use the hardcoded ID
        try:
            search_results = await self.search("0Buck: 全球运营中控 (v3.0)", filter_type="database")
            if search_results.get("results"):
                for db in search_results["results"]:
                    title_list = db.get("title", [])
                    if title_list and title_list[0].get("plain_text") == "0Buck: 全球运营中控 (v3.0)":
                        database_id = db["id"]
                        print(f"DEBUG: Found database via search: {database_id}")
                        break
        except Exception:
            pass
        
        if not database_id:
            return []
            
        pages = await self.get_database_contents(database_id)
        
        parsed_products = []
        for page in pages:
            props = page.get("properties", {})
            
            def get_val(prop_names: List[str]):
                for name in prop_names:
                    p = props.get(name)
                    if not p: continue
                    ptype = p.get("type")
                    if not ptype: continue
                    
                    try:
                        if ptype == "title":
                            return p["title"][0]["text"]["content"] if p["title"] else ""
                        elif ptype == "rich_text":
                            return p["rich_text"][0]["text"]["content"] if p["rich_text"] else ""
                        elif ptype == "number":
                            return p["number"]
                        elif ptype == "select":
                            return p["select"]["name"] if p["select"] else ""
                        elif ptype == "status":
                            return p["status"]["name"] if p["status"] else ""
                        elif ptype == "date":
                            return p["date"]["start"] if p["date"] else ""
                        elif ptype == "url":
                            return p["url"]
                        elif ptype == "checkbox":
                            return p["checkbox"]
                    except (IndexError, KeyError, TypeError):
                        continue
                return None

            # v3.0 Column Mapping (A-L)
            comp_price = get_val(["G: 亚马逊/eBay 价格", "亚马逊/eBay 价格"]) or 0.0
            cost_cny = get_val(["F: 1688 拿货价格", "1688 拿货价格"]) or 0.0
            url_1688 = get_val(["E: 1688 链接", "1688 链接"])
            id_1688 = get_val(["1688 编号"])
            
            if not id_1688 and url_1688:
                import re
                match = re.search(r'/offer/(\d+)\.html', url_1688)
                if match:
                    id_1688 = match.group(1)
            
            selling_price = round(float(comp_price) * 0.60, 2)
            
            # 300% Profit Rule: Selling Price >= Cost_USD * 4
            cost_usd = float(cost_cny) * 0.14
            is_pass = selling_price >= (cost_usd * 4) if cost_usd > 0 else False
            
            # Use the most likely property name for audit status
            audit_status_prop = "审核状态"
            if "B: 审核状态" in props:
                audit_status_prop = "B: 审核状态"
            
            audit_status = get_val([audit_status_prop]) or "草稿"
            print(f"DEBUG: Found {get_val(['C: 商品名', '商品名'])} with status {audit_status}")

            parsed_products.append({
                "notion_page_id": page["id"],
                "audit_status_prop_name": audit_status_prop,
                "time": get_val(["A: 时间", "时间"]),
                "audit_status": audit_status,
                "name": get_val(["C: 商品名", "商品名"]),
                "reason_team": get_val(["D: 选品理由", "选品理由 (团队)"]),
                "url_1688": url_1688,
                "id_1688": id_1688,
                "cost_cny": float(cost_cny),
                "comp_price": float(comp_price),
                "url_comp": get_val(["H: 亚马逊/ebay 链接", "亚马逊/eBay 链接"]),
                "selling_price": get_val(["I: 预计销售价", "预计销售价"]),
                "profit_ratio": get_val(["J: 利润比", "利润比"]),
                "category": get_val(["K: 商品分类", "商品分类"]),
                "reason_boss": get_val(["L: 选品理由", "选品理由 (Boss)"]),
                "is_cashback_eligible": get_val(["M: 返现资格", "返现资格"]) != "不参与",
                "shopify_id": get_val(["Shopify ID"]),
                "is_pass": is_pass
            })
            
        return parsed_products

    async def add_product_to_pool(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Adds a product to the '0Buck: 全球运营中控 (v3.0)' following exact schema."""
        if not hasattr(self, "_ops_hub_db_id"):
            search_results = await self.search("0Buck: 全球运营中控 (v3.0)", filter_type="database")
            if search_results.get("results"):
                for db in search_results["results"]:
                    title_list = db.get("title", [])
                    if title_list and title_list[0].get("plain_text") == "0Buck: 全球运营中控 (v3.0)":
                        self._ops_hub_db_id = db["id"]
                        break
            if not hasattr(self, "_ops_hub_db_id"):
                self._ops_hub_db_id = "3372ab9f-0c63-8128-91cb-da0163c32085"
        
        database_id = self._ops_hub_db_id

        from datetime import datetime
        comp_price = float(data.get("comp_price", 0.0))
        cost_cny = float(data.get("cost_cny", 0.0))
        selling_price = round(comp_price * 0.60, 2)
        
        # Profit Ratio = Selling Price / Cost_USD
        cost_usd = cost_cny * 0.14
        profit_ratio = round(selling_price / cost_usd, 2) if cost_usd > 0 else 0.0

        properties = {
            "时间": {"date": {"start": datetime.now().strftime("%Y-%m-%d")}},
            "审核状态": {"select": {"name": data.get("status", "待审核")}},
            "商品名": {"title": [{"text": {"content": data.get("name", "New Product")}}]},
            "功能描述": {"rich_text": [{"text": {"content": data.get("description_zh", "")}}]},
            "热门趋势介绍": {"rich_text": [{"text": {"content": data.get("trend_insights", "")}}]},
            "选品理由 (团队)": {"rich_text": [{"text": {"content": data.get("reason_team", "符合趋势爆款")}}]},
            "1688 链接": {"url": data.get("url_1688") if data.get("url_1688") else None},
            "1688 拿货价格": {"number": cost_cny},
            "亚马逊/eBay 价格": {"number": comp_price},
            "亚马逊/eBay 链接": {"url": data.get("url_comp") if data.get("url_comp") else None},
            "预计销售价 (60%)": {"number": selling_price},
            "利润比": {"number": profit_ratio},
            "商品分类": {"select": {"name": data.get("category", "待定")}},
            "选品理由 (Boss)": {"rich_text": [{"text": {"content": data.get("reason_boss", "利润 > 300% & 极简黑金调性")}}]},
            "1688 编号": {"rich_text": [{"text": {"content": data.get("id_1688", "")}}]},
            "Shopify ID": {"rich_text": [{"text": {"content": data.get("shopify_id", "")}}]}
        }
        
        # Remove None values to be safe
        properties = {k: v for k, v in properties.items() if v is not None}
        
        try:
            return await self.add_page_to_database(database_id, properties)
        except Exception as e:
            print(f"DEBUG Payload: {json.dumps(properties, indent=2, ensure_ascii=False)}")
            raise e

    async def update_page_properties(self, page_id: str, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Updates properties of an existing page."""
        return await self._request("PATCH", f"/pages/{page_id}", {"properties": properties})

    async def get_spy_targets(self) -> List[Dict[str, Any]]:
        """Fetches targets from the '0Buck: 竞品监控中心' database."""
        database_id = None
        search_results = await self.search("0Buck: 竞品监控中心", filter_type="database")
        if search_results.get("results"):
            database_id = search_results["results"][0]["id"]
        
        if not database_id:
            print("  ⚠️ '0Buck: 竞品监控中心' not found. Returning empty targets.")
            return []

        pages = await self.get_database_contents(database_id)
        targets = []
        for page in pages:
            props = page.get("properties", {})
            
            def get_val(prop_names: List[str]):
                for name in prop_names:
                    p = props.get(name, {})
                    if not p: continue
                    ptype = p.get("type")
                    if ptype == "title":
                        return p["title"][0]["text"]["content"] if p["title"] else ""
                    elif ptype == "url":
                        return p["url"]
                    elif ptype == "select":
                        return p["select"]["name"] if p["select"] else ""
                return None

            status = get_val(["监控状态"])
            if status != "正在监控":
                continue

            targets.append({
                "page_id": page["id"],
                "name": get_val(["竞品名称"]),
                "url": get_val(["店铺/商品链接"]),
                "platform": get_val(["平台"])
            })
        return targets

    async def add_spy_target(self, name: str, url: str, platform: str = "Amazon"):
        """Adds a new competitor target to '0Buck: 竞品监控中心'."""
        # Find or create database logic... (Simplified for now, assuming it exists or needs creation)
        pass
        """Initializes the 5 core modules of the 0Buck Ops Hub in Chinese."""
        databases = {}
        
        # 1. 爆点信号捕捉 (Viral Signals)
        viral_props = {
            "趋势主题": {"title": {}},
            "趋势热度": {"number": {"format": "number"}},
            "来源平台": {"select": {"options": [
                {"name": "TikTok", "color": "pink"},
                {"name": "Instagram", "color": "purple"},
                {"name": "X", "color": "blue"}
            ]}},
            "原始链接": {"url": {}},
            "处理状态": {"select": {"options": [
                {"name": "待处理", "color": "blue"},
                {"name": "分析中", "color": "yellow"},
                {"name": "候选款", "color": "green"},
                {"name": "已淘汰", "color": "red"}
            ]}}
        }
        db_viral = await self.create_database(parent_page_id, "0Buck: 爆点信号捕捉", viral_props)
        databases["viral_signals"] = db_viral["id"]

        # 2. 选品审核池 (Product Selection)
        product_props = {
            "审核状态": {"select": {"options": [
                {"name": "草稿", "color": "gray"},
                {"name": "分析中", "color": "blue"},
                {"name": "审核通过", "color": "green"},
                {"name": "已同步", "color": "purple"},
                {"name": "已淘汰", "color": "red"}
            ]}},
            "商品名": {"title": {}},
            "1688 编号": {"rich_text": {}},
            "选品理由 (中文)": {"rich_text": {}},
            "商品分类": {"select": {"options": [
                {"name": "智能家居", "color": "blue"},
                {"name": "办公数码", "color": "gray"},
                {"name": "户外运动", "color": "green"},
                {"name": "特价清仓", "color": "red"}
            ]}},
            "1688 商品链接": {"url": {}},
            "亚马逊/eBay 链接": {"url": {}},
            "亚马逊/eBay 零售价": {"number": {"format": "dollar"}},
            "1688 价格 (拿货价+国际段运费)": {"number": {"format": "dollar"}},
            "划线价 (亚马逊/eBay 售价 * 95%)": {"number": {"format": "dollar"}},
            "建议售价 (亚马逊/eBay 售价 * 60%)": {"number": {"format": "dollar"}},
            "利润比 (建议价/拿货价)": {"number": {"format": "number"}},
            "shopify 编号": {"rich_text": {}}
        }
        db_product = await self.create_database(parent_page_id, "0Buck: 选品审核池 (v2.0)", product_props)
        databases["product_selection"] = db_product["id"]

        # 3. 供应商管理 (Supplier CRM)
        supplier_props = {
            "供应商名称": {"title": {}},
            "1688 供应商编号": {"rich_text": {}},
            "供应类目": {"multi_select": {}},
            "评分": {"number": {"format": "number"}},
            "联系方式": {"rich_text": {}}
        }
        db_supplier = await self.create_database(parent_page_id, "0Buck: 供应商管理", supplier_props)
        databases["supplier_crm"] = db_supplier["id"]

        # 4. 达人全生命周期 (KOL Lifecycle)
        kol_props = {
            "达人名称": {"title": {}},
            "客户编号": {"rich_text": {}},
            "达人等级": {"select": {"options": [
                {"name": "创始成员", "color": "yellow"},
                {"name": "白银", "color": "gray"},
                {"name": "黄金", "color": "orange"},
                {"name": "铂金", "color": "blue"}
            ]}},
            "佣金比例": {"number": {"format": "percent"}},
            "累计收益": {"number": {"format": "dollar"}}
        }
        db_kol = await self.create_database(parent_page_id, "0Buck: 达人全生命周期", kol_props)
        databases["kol_lifecycle"] = db_kol["id"]

        # 5. 订单对账中心 (Order Operations)
        order_props = {
            "订单号": {"title": {}},
            "履约状态": {"select": {"options": [
                {"name": "已支付", "color": "blue"},
                {"name": "代采中", "color": "yellow"},
                {"name": "已发货", "color": "purple"},
                {"name": "已妥投", "color": "green"}
            ]}},
            "奖励模式": {"select": {"options": [
                {"name": "500签到", "color": "orange"},
                {"name": "3人免单", "color": "blue"}
            ]}},
            "当前期数": {"number": {}},
            "最后对账": {"date": {}}
        }
        db_order = await self.create_database(parent_page_id, "0Buck: 订单对账中心", order_props)
        databases["order_ops"] = db_order["id"]

        return databases
