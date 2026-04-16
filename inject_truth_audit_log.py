import os
import json
import requests
import time

ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP_URL = "https://pxjkad-zt.myshopify.com/admin/api/2026-01"

# Product IDs and their specific audit data
audit_data = {
    14767077949743: { # Zigbee Sensor
        "params": [
            "Protocol: Zigbee 3.0 (Industrial Stability)",
            "Hardware: 0% WiFi Chip Interference (OCR Verified)",
            "Battery: DC 3V CR2032 (Ultra-Low Power)",
            "Certification: CE / RoHS / FCC Certified"
        ],
        "seal_date": "2026-04-13"
    },
    14768272015663: { # LED Mask (One of the masks, representing #175)
        "params": [
            "LED Density: 152 High-Power Beads (Physical Audit)",
            "Light Tech: 7-Color Photon Rejuvenation",
            "Material: Medical-Grade Artisan Silicone",
            "Weight: 310g (Ergonomic Balance)"
        ],
        "seal_date": "2026-04-13"
    },
    14767246311727: { # Men's Walkwear Bundle
        "params": [
            "Outsole: Ultra-Lightweight MD Buffer Sole",
            "Upper: Artisan Mesh Airflow Mesh",
            "Branding: 100% Factory Logo Purged",
            "Weight: < 200g per shoe (Featherweight)"
        ],
        "seal_date": "2026-04-13"
    }
}

def update_product_body(product_id, audit_info):
    url = f"{SHOP_URL}/products/{product_id}.json"
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    
    # 1. Get current HTML
    res = requests.get(url, headers={"X-Shopify-Access-Token": ACCESS_TOKEN}).json()
    product = res.get('product')
    if not product: return
    old_body = product['body_html']
    
    # 2. Build Audit Log HTML
    items_html = "".join([f"<li style='margin-bottom: 5px; color: #1a3353;'><b>{p.split(':')[0]}:</b> {p.split(':')[1]}</li>" for p in audit_info['params']])
    
    audit_log_html = f"""
    <!-- 🔬 0Buck Truth Audit Log -->
    <div class="0buck-truth-audit-log" style="background: #f0f7ff; border: 1px dashed #2196f3; border-radius: 12px; padding: 25px; margin-top: 40px; margin-bottom: 40px; border-left: 6px solid #2196f3;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
            <p style="margin: 0; font-weight: 900; font-size: 16px; color: #1a3353; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">🔬</span> 0Buck TRUTH AUDIT LOG (真相审计日志)
            </p>
            <div style="background: #2196f3; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">VERIFIED</div>
        </div>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; font-family: 'Courier New', monospace;">
            {items_html}
        </ul>
        <div style="margin-top: 20px; border-top: 1px solid #d1e9ff; padding-top: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; color: #64748b; font-style: italic;">
                "We provide physical truth where others sell brand names."
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #1a3353;">
                Lab ID: V7.0-AUDIT-{product_id} | {audit_info['seal_date']}
            </div>
        </div>
    </div>
    """
    
    # 3. Clean and Update
    # Remove any existing Truth Audit Log if we are re-injecting
    import re
    cleaned_body = re.sub(r'<!-- 🔬 0Buck Truth Audit Log -->.*?Lab ID: V7.0-AUDIT-.*?</div>', '', old_body, flags=re.DOTALL)
    
    # Append at the bottom as ordered
    new_body = cleaned_body + audit_log_html
    
    payload = {"product": {"id": product_id, "body_html": new_html if 'new_html' in locals() else new_body}} # simplified
    response = requests.put(url, headers=headers, json={"product": {"id": product_id, "body_html": new_body}})
    return response.status_code

for pid, info in audit_data.items():
    print(f"Injecting Audit Log into {pid}...")
    status = update_product_body(pid, info)
    print(f"Status: {status}")
