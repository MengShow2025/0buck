import json
import httpx
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.product import Product, Supplier
from backend.app.core.config import settings

class Sync1688Service:
    def __init__(self, db: Session):
        self.db = db
        # Placeholder for 1688 API (ElimAPI or similar)
        self.api_key = settings.ALIBABA_1688_API_KEY 
        self.api_base_url = settings.ALIBABA_1688_API_URL

    async def fetch_product_details(self, product_id_1688: str) -> Dict[str, Any]:
        """
        Fetch product details from 1688 API.
        """
        # Suggested Priority Categories:
        # 1. Smart Home 小家电 (Humidifier, Sensing Light)
        # 2. Office Tech 办公数码 (Mechanical Keyboard, Stand)
        # 3. Outdoor 户外生活 (Picnic Mat, Camping Light)
        
        # Placeholder for actual API call
        # Mock response based on 1688 API schema
        return {
            "id": product_id_1688,
            "title": "测试商品 - 1688",
            "description": "这是从1688抓取的商品描述。",
            "price": 50.0, # CNY
            "images": ["url1", "url2"],
            "variants": [{"id": "v1", "price": 50.0, "stock": 100}],
            "category": "Smart Home", # Prioritize Smart Home, Office Tech, Outdoor
            "supplier": {
                "id": "sup_123",
                "name": "某1688优质供应商",
                "rating": 4.8
            }
        }

    async def translate_and_enrich(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Use AI to translate title/description and extract structured attributes.
        """
        # Use Gemini for high-quality translation & enrichment
        # Here we also tag the product category if it matches the priority ones.
        product_data["title_en"] = f"Translated: {product_data['title']}"
        product_data["description_en"] = f"Translated Description: {product_data['description']}"
        return product_data

    def calculate_price(self, cost_cny: float) -> Dict[str, Any]:
        """
        Apply differential pricing strategy from PRD.
        1688 cost (CNY) -> USD sale price
        Returns both price and reward eligibility.
        """
        # Approximate CNY to USD conversion (1 CNY = 0.14 USD)
        cost_usd = cost_cny * 0.14
        
        # Differential pricing rules from PRD:
        if cost_usd <= 5:
            multiplier = 3.0
        elif cost_usd <= 20:
            multiplier = 2.0
        elif cost_usd <= 50:
            multiplier = 1.6
        else:
            multiplier = 1.4
            
        sale_price = cost_usd * multiplier
        
        # Reward eligibility: High margin products (multiplier >= 1.6)
        is_reward_eligible = multiplier >= 1.6
        
        return {
            "sale_price": round(sale_price, 2),
            "is_reward_eligible": is_reward_eligible
        }

    async def trigger_sourcing(self, order_id: int, line_items: List[Dict[str, Any]]):
        """
        Trigger 1688 sourcing for paid Shopify orders.
        Extracts 1688 IDs from SKU/Metafields and creates procurement orders.
        """
        print(f"Triggering 1688 Sourcing for Shopify Order: {order_id}")
        procurement_orders = []
        for item in line_items:
            sku = item.get("sku", "")
            quantity = item.get("quantity", 1)
            # In production, we extract the 1688 product ID and variant ID from SKU or metadata
            # e.g., SKU: 1688_67891234_v5
            print(f"  Item: {item.get('title')} (SKU: {sku}) x{quantity}")
            
            # --- Mock 1688 Procurement API call ---
            # In a real scenario, this would call ElimAPI or 1688 Open Platform
            order_payload = {
                "external_order_id": str(order_id),
                "sku": sku,
                "quantity": quantity,
                "shipping_address": "Mock Hub Shenzhen, China"
            }
            # Response mock
            mock_1688_order_id = f"1688_{order_id}_{sku}"
            procurement_orders.append({
                "item": item.get("title"),
                "1688_order_id": mock_1688_order_id,
                "status": "created"
            })
            print(f"  Mock 1688 Order Created: {mock_1688_order_id}")
            # --- End Mock ---
        
        return procurement_orders

    async def sync_product(self, product_id_1688: str):
        # 1. Fetch
        raw_data = await self.fetch_product_details(product_id_1688)
        
        # 2. Translate & Enrich
        enriched_data = await self.translate_and_enrich(raw_data)
        
        # 3. Calculate Price & Eligibility
        pricing_result = self.calculate_price(enriched_data["price"])
        sale_price_usd = pricing_result["sale_price"]
        is_reward_eligible = pricing_result["is_reward_eligible"]
        
        # 4. Save to DB
        supplier = self.db.query(Supplier).filter_by(supplier_id_1688=enriched_data["supplier"]["id"]).first()
        if not supplier:
            supplier = Supplier(
                supplier_id_1688=enriched_data["supplier"]["id"],
                name=enriched_data["supplier"]["name"],
                rating=enriched_data["supplier"]["rating"]
            )
            self.db.add(supplier)
            self.db.commit()
            self.db.refresh(supplier)
            
        product = self.db.query(Product).filter_by(product_id_1688=product_id_1688).first()
        if not product:
            product = Product(product_id_1688=product_id_1688)
            self.db.add(product)
            
        product.title_zh = enriched_data["title"]
        product.title_en = enriched_data["title_en"]
        product.description_zh = enriched_data["description"]
        product.description_en = enriched_data["description_en"]
        product.original_price = enriched_data["price"]
        product.sale_price = sale_price_usd
        product.is_reward_eligible = is_reward_eligible
        product.images = enriched_data["images"]
        product.variants = enriched_data["variants"]
        product.category = enriched_data.get("category", "General")
        product.supplier_id = supplier.id
        product.last_synced_at = datetime.utcnow()
        
        self.db.commit()
        return product
