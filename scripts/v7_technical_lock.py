import os
import sys

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify

load_dotenv()

def technical_lock():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    # 1. #175 LED Mask - Air Column Bag
    # ID from DB was 14805576253743
    try:
        mask = shopify.Product.find(14805576253743)
        # Add a clear section in body_html
        lock_html = """
        <div class="technical-lock" style="border: 2px dashed #000; padding: 15px; margin: 20px 0; background: #fff5f5;">
            <strong style="color: #d00;">🔒 Industrial Fulfillment Lock:</strong><br/>
            This item is physically verified for high-fragility. 0Buck mandates <strong>Mandatory Air Column Bag</strong> reinforcement for all international transit.
        </div>
        """
        if "Industrial Fulfillment Lock" not in mask.body_html:
            mask.body_html = lock_html + mask.body_html
            mask.save()
            print("   ✅ #175 Mask: Technical Lock (Air Column Bag) Injected.")
    except Exception as e:
        print(f"   ❌ #175 Error: {e}")

    # 2. #154 Sensor - Zigbee 3.0 Lock
    # ID from DB was 14805577793839
    try:
        sensor = shopify.Product.find(14805577793839)
        # Update variant to explicitly state Zigbee 3.0
        for v in sensor.variants:
            if "Zigbee 3.0" not in v.title:
                v.option1 = "Zigbee 3.0 + Matter Ready"
                v.save()
        
        lock_html_sensor = """
        <div class="technical-lock" style="border: 2px dashed #000; padding: 15px; margin: 20px 0; background: #f0f7ff;">
            <strong style="color: #0056b3;">🔒 Hardware Protocol Lock:</strong><br/>
            Verified Hardware: <strong>Zigbee 3.0</strong> (Silicon Labs Chipset). 100% Matter compatible via compliant gateway.
        </div>
        """
        if "Hardware Protocol Lock" not in sensor.body_html:
            sensor.body_html = lock_html_sensor + sensor.body_html
            sensor.save()
            print("   ✅ #154 Sensor: Technical Lock (Zigbee 3.0) Injected.")
    except Exception as e:
        print(f"   ❌ #154 Error: {e}")

    shopify.ShopifyResource.clear_session()

if __name__ == "__main__":
    technical_lock()
