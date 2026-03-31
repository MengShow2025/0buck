import json
import httpx
import asyncio

async def run_test():
    webhook_url = "http://localhost:8000/api/v1/webhooks/shopify/orders/paid"
    
    payload = {
        "id": 555001,
        "total_price": "89.90",
        "total_tax": "5.40",
        "total_shipping_price_set": {
            "shop_money": {
                "amount": "10.00"
            }
        },
        "customer": {
            "id": 99912345,
            "email": "tester@0buck.com",
            "timezone": "Asia/Shanghai"
        },
        "line_items": [
            {
                "id": 1,
                "product_id": 14115444261167,
                "title": "[0Buck] 0Buck Crystal Glow Bluetooth Speaker - HiFi Deep Bass",
                "sku": "",
                "quantity": 1,
                "price": "74.50"
            }
        ],
        "currency": "USD"
    }
    
    headers = {
        "Content-Type": "application/json",
        "X-Shopify-Topic": "orders/paid",
        "X-Shopify-Hmac-Sha256": "mock_hmac",
        "X-Shopify-Shop-Domain": "pxjkad-zt.myshopify.com"
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(webhook_url, json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        try:
            print(f"Response: {response.json()}")
        except:
            print(f"Raw Response: {response.text}")

if __name__ == "__main__":
    asyncio.run(run_test())
