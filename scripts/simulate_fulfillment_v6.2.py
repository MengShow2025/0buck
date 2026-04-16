import asyncio
import os
import sys
import json
import logging

# Ensure project root is in sys.path
project_root = os.getcwd()
sys.path.append(os.path.join(project_root, 'backend'))

from app.db.session import SessionLocal
from app.services.fulfillment_cj import CJFulfillmentService

# Setup logging
logging.basicConfig(level=logging.INFO)

async def simulate_test_order():
    db = SessionLocal()
    fulfillment = CJFulfillmentService(db)
    
    # Mock Shopify orders/paid payload
    # Case: User buys 1 unit of the 6-Pack T-Shirt (ID 271)
    # SKU should be the Amazon ASIN or the CJ PID stored in the DB
    test_payload = {
        "id": 999999,
        "order_number": 1001,
        "total_price": "65.99",
        "customer": {"id": 12345, "email": "test@0buck.com"},
        "shipping_address": {
            "first_name": "Test",
            "last_name": "User",
            "address1": "123 Truth St",
            "city": "Los Angeles",
            "province": "California",
            "country": "United States",
            "country_code": "US",
            "zip": "90001",
            "phone": "555-0123"
        },
        "line_items": [
            {
                "id": 1,
                "sku": "B0BJZ9GT1J", # Amazon ASIN for ID 271
                "quantity": 1,
                "price": "65.99",
                "title": "0Buck Verified Artisan: 240g Heavy T-Shirt (6-Pack Bundle)"
            }
        ]
    }
    
    print("🧪 Simulating Step 6 Fulfillment for Order #1001...")
    # Note: We don't want to actually call the CJ API's createOrder endpoint in a dry run,
    # but the logic up to that point should be verified.
    # I'll temporarily mock the cj_api.create_order to just print the payload.
    
    original_create = fulfillment.cj_api.create_order
    async def mock_create(order_data):
        print("\n📦 [MOCK] CJ Order Payload Created:")
        print(json.dumps(order_data, indent=2))
        return {"success": True, "data": [{"cjOrderId": "CJ-TEST-123"}]}
    
    fulfillment.cj_api.create_order = mock_create
    
    # Mock logistics calculation to avoid network calls
    async def mock_freight(*args, **kwargs):
        return [{"logisticName": "CJ Packet Sensitive", "fee": 10.5}]
    fulfillment.cj_api.get_freight_calculate = mock_freight
    
    res = await fulfillment.process_shopify_order(test_payload)
    print(f"\n🚩 Simulation Result: {res}")
    
    db.close()

if __name__ == "__main__":
    asyncio.run(simulate_test_order())
