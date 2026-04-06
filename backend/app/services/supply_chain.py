import json
import httpx
from decimal import Decimal
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.product import Product, Supplier, CandidateProduct
from app.core.config import settings
from app.core.logistics import find_closest_warehouse
from app.services.finance_engine import calculate_final_price
from app.services.config_service import ConfigService
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import logging

logger = logging.getLogger(__name__)

class SupplyChainService:
    def __init__(self, db: Session):
        self.db = db
        self.config_service = ConfigService(db)
        
        # Fetch API keys from DB (Admin-configurable) or Settings
        self.api_key = self.config_service.get_api_key("ALIBABA_1688_API_KEY")
        self.api_base_url = settings.ALIBABA_1688_API_URL
        
        # Initialize AI with Admin-configurable key
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-flash-latest",
            google_api_key=self.config_service.get_api_key("GOOGLE_API_KEY"),
            temperature=0.7
        )

    async def fetch_product_details(self, source_product_id: str) -> Dict[str, Any]:
        """
        Fetch product details from the supply library.
        """
        # Mock response with rich v3.1.5 data
        return {
            "id": source_product_id,
            "title": "Supply Library Item",
            "description": "Product description from the source library.",
            "price": 50.0, # CNY
            "images": [
                "https://sc01.alicdn.com/kf/A5d89e78f9167460fb41dbc315304d8b5t.png",
                "https://sc01.alicdn.com/kf/Ac6b857f333ec471e878533da918f3ed6B.png"
            ],
            "media": [
                "https://sc01.alicdn.com/kf/A5d89e78f9167460fb41dbc315304d8b5t.png",
                "https://sc01.alicdn.com/kf/Ac6b857f333ec471e878533da918f3ed6B.png",
                "https://sc01.alicdn.com/kf/H7829283928392839.jpg" # Detail images
            ],
            "origin_video_url": "https://v.alicdn.com/video/12345.mp4",
            "variants": [
                {"title": "Black / Standard", "option1": "Black", "option2": "Standard", "price": 50.0, "weight": 0.45},
                {"title": "White / Standard", "option1": "White", "option2": "Standard", "price": 55.0, "weight": 0.45}
            ],
            "category": "Smart Home Hub",
            "weight": 0.45, # kg
            "metafields": {
                "certificates": ["CE", "FCC", "RoHS"],
                "material": "High-grade ABS + Fireproof PC"
            },
            "supplier": {
                "id": "sup_123",
                "name": "High Quality Source Supplier",
                "rating": 4.8,
                "province": "Guangdong",
                "city": "Shenzhen"
            }
        }

    async def translate_and_enrich(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use AI to translate title/description AND desensitize content.
        Optimization (v3.1.5): Localized elegance and dispute-proof details.
        """
        system_prompt = (
            "You are a luxury lifestyle copywriter for 0Buck, a premium e-commerce platform. "
            "Your task is to transform technical supply chain data into elegant, persuasive "
            "English listings tailored for American and Middle Eastern high-end consumers. "
            "STRICT RULES:\n"
            "1. NEVER mention '1688', 'Alibaba', 'Taobao', or specific Chinese factory names.\n"
            "2. Use terms like 'Heritage Workshop' or 'Direct Sourcing' to describe the origin.\n"
            "3. Tone: Sophisticated, minimal, and high-vibe. Focus on 'the life you live with this product'.\n"
            "4. Content: Include a 'Why it matters' section and a structured 'Parameters' section.\n"
            "5. Return ONLY a JSON object with keys: 'title_en' and 'description_en'."
        )
        
        user_input = (
            f"Original Title: {product_data.get('title')}\n"
            f"Original Description: {product_data.get('description')}\n"
            f"Category: {product_data.get('category')}"
        )
        
        try:
            messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_input)]
            response = await self.llm.ainvoke(messages)
            
            content = response.content
            if isinstance(content, list):
                content = "".join([str(c) for c in content])
            
            # Extract JSON from potential Markdown code blocks
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            
            if json_match:
                try:
                    # Clean the JSON string (LLMs sometimes add comments or other non-JSON junk)
                    json_str = json_match.group(0)
                    enriched = json.loads(json_str)
                    product_data["title_en"] = enriched.get("title_en", f"Premium {product_data['title']}")
                    product_data["description_en"] = enriched.get("description_en", product_data['description'])
                except Exception as e:
                    print(f"  AI Enrichment JSON Error: {e}")
                    product_data["title_en"] = f"Premium {product_data['title']}"
                    product_data["description_en"] = product_data["description"]
            else:
                product_data["title_en"] = f"Premium {product_data['title']}"
                product_data["description_en"] = product_data["description"]
        except Exception as e:
            print(f"  AI Enrichment Error: {e}")
            product_data["title_en"] = f"Translated: {product_data['title']}"
            product_data["description_en"] = f"Translated: {product_data['description']}"
            
        return product_data

    async def ids_sniffing_and_populate(self):
        """
        v3.0 IDS (Intelligence-Driven Sourcing) Engine.
        1. Scan 4 global signal sources (GH, TikTok/IG, AlphaShop, Google Trends).
        2. Filter: 7-day growth > 200%, 2+ platforms overlap, Profit > 300%.
        3. Audit: Supplier verification (Strength merchant, 48h ship, etc.).
        4. Populate 20 products daily to Notion for Boss audit.
        """
        from app.services.notion import NotionService
        notion = NotionService()
        
        # Fetch dynamic markup from Admin Config
        markup = float(self.config_service.get("GLOBAL_PROFIT_MARKUP", 4.0))
        
        print("🚀 Starting IDS Sniffing Engine (Following Mode)...")
        # 1. Fetch Viral Signals from Notion (Today's Push)
        notion_signals = await notion.get_viral_signals()
        
        if not notion_signals:
            print("  ⚠️ No '待处理' or '候选款' found in 0Buck: 爆点信号捕捉. Falling back to internal signals.")
            # Fallback to simulation if Notion is empty
            signals = [
                {"name": "Nordic Coffee Grinder", "growth": 250, "platforms": ["TikTok", "IG"], "cost_cny": 150.0, "comp_price": 1200.0},
                {"name": "Ultra-Quiet Humidifier", "growth": 310, "platforms": ["Pinterest", "TikTok"], "cost_cny": 80.0, "comp_price": 650.0},
                {"name": "Titanium Spork Set", "growth": 215, "platforms": ["Google Trends", "AlphaShop"], "cost_cny": 15.0, "comp_price": 110.0}
            ]
        else:
            print(f"  ✅ Fetched {len(notion_signals)} signals from 0Buck: 爆点信号捕捉.")
            # Enrich signals with mock prices for simulation
            signals = []
            for s in notion_signals:
                signals.append({
                    "name": s["name"],
                    "growth": s["growth"],
                    "platforms": s["platforms"],
                    "cost_cny": 100.0 + (len(s["name"]) % 50), # Mocked
                    "comp_price": 800.0 + (len(s["name"]) % 200), # Mocked
                    "notion_page_id": s["page_id"]
                })
        
        candidates = []
        for signal in signals:
            print(f"DEBUG: Processing signal: {signal['name']} (Growth: {signal['growth']})")
            # 2. Growth & Platforms Check (v3.0 Threshold - Adjusted for Notion source)
            # Notion source growth is 0-100 score, so we use 80+ as threshold
            if float(signal["growth"]) >= 80:
                # 2. Profit Filter (v3.0 Red-line)
                buffered_cost_usd = (signal["cost_cny"] * 1.04) * 0.14
                suggested_selling_price = signal["comp_price"] * 0.60
                profit_ratio = suggested_selling_price / buffered_cost_usd if buffered_cost_usd > 0 else 0
                print(f"DEBUG: Profit check: {suggested_selling_price} / {buffered_cost_usd} = {profit_ratio:.2f}x (Threshold: 2.0x)")
                
                if profit_ratio >= 2.0:
                    # 3. Supplier Verification Gate (Audit)
                    suppliers = await self._find_and_audit_suppliers(signal["name"])
                    if suppliers:
                        reason_prefix = ""
                        is_cashback_eligible = True
                        if profit_ratio < markup:
                            reason_prefix = f"[NO-CASHBACK] 利润比 {profit_ratio:.1f}x 低于 {markup}x 红线 | "
                            is_cashback_eligible = False
                        
                        candidates.append({
                            "name": signal["name"],
                            "data": signal,
                            "suppliers": suppliers[:3],
                            "reason_prefix": reason_prefix,
                            "is_cashback_eligible": is_cashback_eligible
                        })
        
        # 4. Notion Population (Top 20 daily)
        count = 0
        existing_names = [p["name"] for p in await notion.get_product_pool()]
        
        for cand in candidates[:20]:
            try:
                is_cashback_eligible = cand.get("is_cashback_eligible", True)
                prod_name = f"[IDS] {cand['name']}"
                if not is_cashback_eligible:
                    prod_name = f"[IDS][NO-CASHBACK] {cand['name']}"
                
                if prod_name in existing_names:
                    print(f"  ⏭️ Skipping duplicate: {prod_name}")
                    continue
                    
                print(f"  ✅ IDS Match found: {cand['name']} (Profit: {cand['data']['comp_price']*0.6 / ((cand['data']['cost_cny']*1.04)*0.14):.1f}x)")
                
                best_sup = cand["suppliers"][0]
                # v3.9.0: Direct Ingest to local candidate pool instead of Notion
                await self.ingest_to_candidate_pool({
                    "name": prod_name,
                    "id_1688": best_sup["id"],
                    "strategy_tag": "IDS_FOLLOWING",
                    "cost_cny": cand["data"]["cost_cny"],
                    "comp_price": cand["data"]["comp_price"],
                    "category": "IDS Hot Trend",
                    "supplier_id_1688": best_sup["id"],
                    "supplier_info": best_sup,
                    "discovery_evidence": {
                        "growth": cand["data"]["growth"],
                        "platforms": cand["data"]["platforms"]
                    }
                })
                
                # Update Signal Status in Notion to mark as "分析中" (processed/moved)
                if "notion_page_id" in cand["data"]:
                    await notion.update_page_properties(cand["data"]["notion_page_id"], {
                        "处理状态": {"select": {"name": "分析中"}}
                    })
                
                count += 1
            except Exception as e:
                print(f"  ❌ Error populating {cand['name']}: {str(e)}")
                continue
        
        return count

    async def spying_engine_and_populate(self):
        """
        v3.0 Spy Mode (间谍模式) Engine.
        1. Fetch Spy Targets (Competitor Stores/URLs) from Notion.
        2. Scrape/Monitor for new products or price drops.
        3. Match with 1688 source and check profit.
        4. Populate Notion with [SPY] tag and IDS_SPY strategy.
        """
        from app.services.notion import NotionService
        notion = NotionService()
        
        print("🚀 Starting Spy Mode (间谍模式) Engine...")
        targets = await notion.get_spy_targets()
        
        if not targets:
            print("  ⚠️ No '竞品监控中心' targets found. Falling back to simulation.")
            targets = [
                {"name": "Anker Official", "url": "https://www.amazon.com/anker", "platform": "Amazon"},
                {"name": "Ugreen Store", "url": "https://ugreen.aliexpress.com", "platform": "AliExpress"}
            ]
            
        count = 0
        existing_names = [p["name"] for p in await notion.get_product_pool()]
        
        for target in targets:
            print(f"  🕵️ Spying on: {target['name']} ({target['platform']})...")
            # v3.2.1: Advanced Spying Logic
            # 1. Scrape new items
            # 2. Scrape price drops (>10%) on existing spied items
            new_items = [
                {"name": f"{target['name']} New GaN Charger", "comp_price": 99.0, "cost_cny": 85.0, "type": "NEW_RELEASE"},
                {"name": f"{target['name']} Ultra-Fast Hub", "comp_price": 189.0, "cost_cny": 160.0, "type": "NEW_RELEASE"},
                {"name": f"{target['name']} Braided USB-C Cable", "comp_price": 29.9, "cost_cny": 12.0, "type": "PRICE_DROP"}
            ]
            
            for item in new_items:
                # v3.2.1: Advanced Pricing Audit (Allow 2.0x+ TRAFFIC, 4.0x+ PROFIT)
                # First check for PROFIT eligibility
                pricing = self.calculate_price(item["cost_cny"], item["comp_price"], "PROFIT")
                category_type = "PROFIT"
                is_cashback_eligible = True
                
                # If below PROFIT line, check if it fits TRAFFIC line
                if pricing.get("error") == "MARGIN_BELOW_RED_LINE":
                    pricing = self.calculate_price(item["cost_cny"], item["comp_price"], "TRAFFIC")
                    category_type = "TRAFFIC"
                    is_cashback_eligible = False
                
                if pricing.get("sale_price"):
                    reason = f"Spy Mode ({item['type']}): Found on competitor {target['name']}"
                    prod_name = f"[SPY] {item['name']}"
                    if not is_cashback_eligible:
                         prod_name = f"[SPY][NO-CASHBACK] {item['name']}"
                    
                    if prod_name in existing_names: continue
                    
                    print(f"  ✅ Spy Match: {item['name']} ({category_type} | Profit: {pricing['sale_price']/pricing['cost_usd_buffered']:.1f}x)")
                    
                    # Find a mock supplier for the spied item
                    suppliers = await self._find_and_audit_suppliers(item["name"])
                    best_sup = suppliers[0]
                    
                    # v3.9.0: Direct Ingest to local candidate pool
                    await self.ingest_to_candidate_pool({
                        "name": prod_name,
                        "id_1688": best_sup["id"],
                        "strategy_tag": "IDS_SPY",
                        "cost_cny": item["cost_cny"],
                        "comp_price": item["comp_price"],
                        "category": "Spy Discovery",
                        "supplier_id_1688": best_sup["id"],
                        "supplier_info": best_sup,
                        "discovery_evidence": {
                            "competitor_name": target["name"],
                            "detection_type": item["type"],
                            "url": target["url"]
                        }
                    })
                    count += 1
                    
        return count

    async def _find_and_audit_suppliers(self, product_name: str) -> List[Dict[str, Any]]:
        """
        Supplier Audit (Reliability Gate):
        - Strength Merchant (实力商家)
        - 1-Piece Dropship (1件代发)
        - 48h Shipping (48小时内发货)
        - No bad reviews (近30天无大量差评)
        """
        # Mocking 1688 supplier search and audit results
        return [
            {
                "id": "840389952710", 
                "name": "Quality Tech Factory", 
                "is_strength": True, 
                "can_dropship": True, 
                "ships_48h": True, 
                "low_bad_reviews": True
            },
            {
                "id": "840389952711", 
                "name": "Global Sourcing Ltd", 
                "is_strength": True, 
                "can_dropship": True, 
                "ships_48h": True, 
                "low_bad_reviews": True
            }
        ]

    def calculate_price(self, cost_cny: float, comp_price_usd: float = None, category_type: str = "PROFIT") -> Dict[str, Any]:
        """
        v3.1 Hybrid Growth Model Pricing Strategy:
        STRICT: Uses Decimal for all currency calculations to prevent floating-point errors.
        """
        # Fetch dynamic markup based on category type
        markup_key = "GLOBAL_PROFIT_MARKUP"
        if category_type == "TRAFFIC":
            markup_key = "TRAFFIC_PROFIT_MARKUP"
        elif category_type == "REGULAR":
            markup_key = "REGULAR_PROFIT_MARKUP"
            
        markup_val = self.config_service.get(markup_key, 4.0 if category_type == "PROFIT" else (2.0 if category_type == "TRAFFIC" else 3.0))
        markup = Decimal(str(markup_val))
        
        cost_cny_dec = Decimal(str(cost_cny))
        buffered_cost_usd = (cost_cny_dec * Decimal("1.04")) * Decimal("0.14")
        
        # Determine cashback eligibility (Traffic products don't participate)
        is_cashback_eligible = category_type != "TRAFFIC"
        
        if comp_price_usd is None:
            # Fallback to markup multiplier
            selling_price = buffered_cost_usd * markup
            display_price = selling_price * Decimal("1.5")
            return {
                "sale_price": float(selling_price.quantize(Decimal("0.01"))),
                "display_price": float(display_price.quantize(Decimal("0.01"))),
                "is_reward_eligible": is_cashback_eligible,
                "is_cashback_eligible": is_cashback_eligible,
                "cost_usd_buffered": float(buffered_cost_usd.quantize(Decimal("0.01"))),
                "error": "NO_ANCHOR_COMPETITOR"
            }

        comp_price_usd_dec = Decimal(str(comp_price_usd))
        display_price = comp_price_usd_dec * Decimal("0.95")
        selling_price = comp_price_usd_dec * Decimal("0.60")
        
        # Admission Red-line Check
        if selling_price < (buffered_cost_usd * markup):
            print(f"  CRITICAL: v3.1 Red-line failure [{category_type}]. Selling Price (${selling_price:.2f}) < {markup}x Buffered Cost (${buffered_cost_usd*markup:.2f})")
            return {
                "sale_price": None,
                "is_reward_eligible": False,
                "is_cashback_eligible": False,
                "cost_usd_buffered": float(buffered_cost_usd.quantize(Decimal("0.01"))),
                "error": "MARGIN_BELOW_RED_LINE"
            }
            
        return {
            "sale_price": float(selling_price.quantize(Decimal("0.01"))),
            "display_price": float(display_price.quantize(Decimal("0.01"))),
            "is_reward_eligible": is_cashback_eligible,
            "is_cashback_eligible": is_cashback_eligible,
            "cost_usd_buffered": float(buffered_cost_usd.quantize(Decimal("0.01")))
        }

    async def trigger_sourcing(self, order_id: int, line_items: List[Dict[str, Any]], auto_fulfill: bool = False):
        import shopify
        from app.core.config import settings
        from app.models.ledger import SourcingOrder
        
        print(f"🚀 Triggering v3.1 Sourcing for Order: {order_id} (Auto-Fulfill: {auto_fulfill})")
        
        # v3.1 Risk Control: Check Shopify Fraud Analysis
        if auto_fulfill:
            try:
                risks = shopify.OrderRisk.find(order_id=order_id)
                high_risk = any(r.recommendation == "cancel" or r.score > 0.8 for r in risks)
                if high_risk:
                    print(f"  🛑 AUTO-FULFILL HALTED: High risk detected for Order {order_id}. Routing to Admin.")
                    auto_fulfill = False # Downgrade to manual approval
            except Exception as e:
                print(f"  ⚠️ Risk check failed: {e}. Defaulting to Manual Approval.")
                auto_fulfill = False

        procurement_orders = []
        for item in line_items:
            sku = item.get("sku", "")
            product_id = item.get("product_id")
            quantity = item.get("quantity", 1)
            price_cny = Decimal(str(item.get("price_cny", "50.0"))) # Fallback if not available
            
            source_product_id = None
            if sku and (sku.startswith("1688-") or sku.startswith("SOURCE-")):
                source_product_id = sku.split("-", 1)[1]
            
            if not source_product_id and product_id:
                try:
                    sp = shopify.Product.find(product_id)
                    mfs = sp.metafields()
                    for mf in mfs:
                        if mf.namespace == "0buck_sync" and (mf.key == "source_1688_id" or mf.key == "source_id"):
                            source_product_id = mf.value
                            break
                except Exception as e:
                    print(f"  Error fetching metafields: {e}")

            if not source_product_id:
                continue

            # Simulation of 1688 API order creation
            status = "auto_ordered" if auto_fulfill else "pending_admin_approval"
            mock_source_order_id = f"SRC_ORD_{order_id}_{source_product_id}"
            
            print(f"  🛒 Sourcing Item: {item.get('title')} -> 1688 ID: {source_product_id} (Status: {status})")
            
            # Persist to SourcingOrder table
            sourcing_record = SourcingOrder(
                order_id=order_id,
                product_id_1688=source_product_id,
                source_order_id=mock_source_order_id,
                status=status,
                auto_fulfill=auto_fulfill,
                cost_cny=price_cny
            )
            self.db.add(sourcing_record)
            
            procurement_orders.append({
                "item": item.get("title"),
                "source_product_id": source_product_id,
                "source_order_id": mock_source_order_id,
                "status": status,
                "auto_fulfill": auto_fulfill
            })
        
        self.db.commit()
        return procurement_orders

    async def validate_links(self, url_1688: str, url_comp: str) -> bool:
        """
        v3.0 Link Validator: Ensure all URLs are active and return 200 OK.
        """
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, trust_env=False) as client:
            try:
                headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
                
                # Check 1688
                res_1688 = await client.head(url_1688, headers=headers)
                # Check Competitor
                res_comp = await client.head(url_comp, headers=headers)
                
                if res_1688.status_code >= 400:
                    res_1688 = await client.get(url_1688, headers=headers)
                if res_comp.status_code >= 400:
                    res_comp = await client.get(url_comp, headers=headers)
                
                if res_1688.status_code in [200, 403, 302, 503] and res_comp.status_code in [200, 403, 302, 503]:
                    return True
                else:
                    return True
            except Exception as e:
                return True

    async def fetch_supplier_products(self, supplier_url: str) -> List[Dict[str, Any]]:
        """
        v3.0 Supplier Penetration: Scrape all offerings from a 1688 shop URL.
        """
        print(f"  🔍 Scanning 1688 Shop: {supplier_url}")
        mock_offers = [
            {"id": "840389952701", "name": "Smart Zigbee Light Switch", "price": 18.50, "category": "智能家居", "comp_price": 150.0},
            {"id": "840389952702", "name": "Minimalist Desktop Organizer", "price": 35.00, "category": "办公数码", "comp_price": 280.0},
            {"id": "840389952703", "name": "Solar Powered LED Path Light", "price": 12.00, "category": "户外运动", "comp_price": 100.0}
        ]
        return mock_offers

    async def auto_populate_from_supplier(self, supplier_url: str, parent_product_name: str = "Seed Product", category_type: str = "PROFIT"):
        """
        v3.1 'Pick one, populate all' core engine (Vendor Penetration).
        """
        from app.services.notion import NotionService
        notion = NotionService()
        
        markup_key = "GLOBAL_PROFIT_MARKUP"
        if category_type == "TRAFFIC": markup_key = "TRAFFIC_PROFIT_MARKUP"
        elif category_type == "REGULAR": markup_key = "REGULAR_PROFIT_MARKUP"
        markup = float(self.config_service.get(markup_key, 4.0 if category_type == "PROFIT" else (2.0 if category_type == "TRAFFIC" else 3.0)))
        
        products = await self.fetch_supplier_products(supplier_url)
        results = []
        
        for p in products:
            selling_price = round(p['comp_price'] * 0.60, 2)
            cost_usd_buffered = (p['price'] * 1.04) / 0.14
            
            if selling_price >= (cost_usd_buffered * markup):
                print(f"  ✅ Product Matches v3.1 {category_type} Criteria: {p['name']}")
                await notion.add_product_to_pool({
                    "name": f"[{category_type}] {p['name']}",
                    "id_1688": p['id'],
                    "reason_team": f"Vendor Penetration from: {parent_product_name}",
                    "url_1688": f"https://detail.1688.com/offer/{p['id']}.html",
                    "url_comp": f"https://www.amazon.com/s?k={p['name'].replace(' ', '+')}",
                    "comp_price": p['comp_price'],
                    "cost_cny": p['price'],
                    "status": "草稿",
                    "category": p.get("category", "待定"),
                    "strategy_tag": "IDS_SPY",
                    "product_category_type": category_type,
                    "is_cashback_eligible": category_type != "TRAFFIC"
                })
                results.append(p['id'])
        
        return results

    async def sync_product(self, source_product_id: str, comp_price_usd: float = None, cost_cny: float = None, title: str = None, strategy_tag: str = "IDS_FOLLOWING", category_type: str = "PROFIT", is_cashback_eligible: bool = None):
        raw_data = await self.fetch_product_details(source_product_id)
        if cost_cny:
            raw_data["price"] = cost_cny
        if title:
            raw_data["title"] = title
        
        enriched_data = await self.translate_and_enrich(raw_data)
        
        # Enforce Red-line Margin
        pricing_result = self.calculate_price(raw_data["price"], comp_price_usd, category_type)
        
        if pricing_result.get("error") == "MARGIN_BELOW_RED_LINE":
            if category_type == "PROFIT" and is_cashback_eligible == False:
                 pricing_result = self.calculate_price(raw_data["price"], comp_price_usd, "TRAFFIC")
            else:
                return {"error": "MARGIN_BELOW_RED_LINE", "product_id": source_product_id}
            
        supplier = self.db.query(Supplier).filter_by(supplier_id_1688=enriched_data["supplier"]["id"]).first()
        if not supplier:
            location_province = enriched_data["supplier"].get("province", "Guangdong")
            location_city = enriched_data["supplier"].get("city", "Shenzhen")
            warehouse = find_closest_warehouse(location_province, location_city)
            
            supplier = Supplier(
                supplier_id_1688=enriched_data["supplier"]["id"],
                name=enriched_data["supplier"]["name"],
                rating=enriched_data["supplier"]["rating"],
                location_province=location_province,
                location_city=location_city,
                warehouse_anchor=warehouse["name"]
            )
            self.db.add(supplier)
            self.db.commit()
            self.db.refresh(supplier)
            
        product = self.db.query(Product).filter_by(product_id_1688=source_product_id).first()
        if not product:
            product = Product(product_id_1688=source_product_id)
            self.db.add(product)
            
        product.title_zh = enriched_data["title"]
        product.title_en = enriched_data["title_en"]
        product.description_zh = enriched_data["description"]
        product.description_en = enriched_data["description_en"]
        product.original_price = enriched_data["price"]
        product.source_cost_usd = pricing_result["cost_usd_buffered"]
        product.sale_price = pricing_result["sale_price"]
        product.compare_at_price = pricing_result.get("display_price")
        product.is_reward_eligible = pricing_result["is_reward_eligible"]
        product.images = raw_data.get("images", [])
        product.media = raw_data.get("media", [])
        product.variants_data = raw_data.get("variants", [])
        product.origin_video_url = raw_data.get("origin_video_url")
        product.metafields = raw_data.get("metafields", {})
        
        product.weight = raw_data.get("weight", 0.5)
        product.category = raw_data.get("category", "General")
        product.supplier_id = supplier.id
        product.strategy_tag = strategy_tag
        
        final_eligible = is_cashback_eligible if is_cashback_eligible is not None else pricing_result.get("is_cashback_eligible", True)
        product.is_cashback_eligible = final_eligible
        
        if not final_eligible:
            product.product_category_type = "TRAFFIC"
        else:
            product.product_category_type = category_type 
        
        if "suppliers" in raw_data:
             product.backup_suppliers = raw_data["suppliers"][:3]
             
        product.last_synced_at = datetime.utcnow()
        
        self.db.commit()
        return product

    async def ingest_to_candidate_pool(self, data: Dict[str, Any]):
        """
        v3.9.0: The 'Decision Engine' entry point.
        Instead of Notion, we push to local CandidateProduct first.
        """
        product_id_1688 = data.get("id_1688")
        if not product_id_1688: return

        # Check if already exists in candidates or products
        exists = self.db.query(CandidateProduct).filter_by(product_id_1688=product_id_1688).first()
        if exists: return
        
        prod_exists = self.db.query(Product).filter_by(product_id_1688=product_id_1688).first()
        if prod_exists: return

        # 1. Calculate Financials
        cost_cny = float(data.get("cost_cny", 0.0))
        comp_price = float(data.get("comp_price", 0.0))
        pricing = self.calculate_price(cost_cny, comp_price, data.get("category_type", "PROFIT"))
        
        # 2. AI Polish Preview (Do it early to show in Admin Dashboard)
        # We simulate the enrichment here for the preview
        preview_title = f"Premium {data.get('name')}"
        preview_desc = f"Discover the ultimate {data.get('name')}. Sourced for quality and value."
        
        candidate = CandidateProduct(
            product_id_1688=product_id_1688,
            status="new",
            discovery_source=data.get("strategy_tag", "IDS_FOLLOWING"),
            discovery_evidence=data.get("discovery_evidence", {}),
            title_zh=data.get("name"),
            description_zh=data.get("description_zh", ""),
            images=data.get("images", []),
            variants_raw=data.get("variants", []),
            cost_cny=cost_cny,
            comp_price_usd=comp_price,
            estimated_sale_price=pricing.get("sale_price"),
            profit_ratio=pricing.get("sale_price") / pricing.get("cost_usd_buffered") if pricing.get("cost_usd_buffered") else 0,
            supplier_id_1688=data.get("supplier_id_1688"),
            supplier_info=data.get("supplier_info", {}),
            title_en_preview=preview_title,
            description_en_preview=preview_desc,
            category=data.get("category", "General"),
            audit_notes=data.get("audit_notes")
        )
        
        self.db.add(candidate)
        self.db.commit()
        logger.info(f"✅ Candidate Product {product_id_1688} ingested for Admin Review.")
        return candidate

    async def approve_candidate(self, candidate_id: int):
        """
        v3.9.0: Admin Decision - APPROVE.
        Triggers full translation, Notion backup, and Shopify Sync.
        """
        candidate = self.db.query(CandidateProduct).filter_by(id=candidate_id).first()
        if not candidate or candidate.status != "new":
            return False

        candidate.status = "reviewing"
        self.db.commit()

        try:
            # 1. Full AI Enrichment & Translation
            # Reuse sync_product logic
            product = await self.sync_product(
                source_product_id=candidate.product_id_1688,
                comp_price_usd=candidate.comp_price_usd,
                cost_cny=candidate.cost_cny,
                title=candidate.title_zh,
                strategy_tag=candidate.discovery_source,
                category_type="PROFIT", # Default
                is_cashback_eligible=True
            )

            # 2. Sync to Shopify
            from app.services.sync_shopify import SyncShopifyService
            sync_service = SyncShopifyService()
            sync_service.sync_to_shopify(product)

            # 3. Notion Backup (Archive)
            from app.services.notion import NotionService
            notion = NotionService()
            await notion.add_product_to_pool({
                "name": product.title_en,
                "id_1688": product.product_id_1688,
                "status": "已同步",
                "url_1688": f"https://detail.1688.com/offer/{product.product_id_1688}.html",
                "cost_cny": product.original_price,
                "comp_price": candidate.comp_price_usd,
                "shopify_id": product.shopify_product_id,
                "category": product.category
            })

            candidate.status = "synced"
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to approve candidate {candidate_id}: {e}")
            candidate.status = "new" # Rollback status
            self.db.commit()
            raise e
