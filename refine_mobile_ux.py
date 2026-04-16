import os
import json
import requests
import time

ACCESS_TOKEN = "os.getenv("SHOPIFY_ACCESS_TOKEN", "")"
SHOP_URL = "https://pxjkad-zt.myshopify.com/admin/api/2026-01"

# Product IDs and their Truth Specs
product_specs = {
    14767250211119: "152 颗大功率灯珠 (Pro版) + 柔性硅胶材质",
    14767246311727: "MD 缓冲大底 + 记忆棉内里 (物理对标 Skechers)",
    14767235137839: "240g 精梳棉 (重磅质感) - 专家审计品质",
    14767077949743: "Zigbee 3.0 协议 + CE/RoHS 工业级认证"
}

def update_product_description(product_id, spec_text, price):
    # Template for mobile-optimized "Truth Engine" UI
    # Using inline CSS that handles mobile gracefully (percent widths, sensible padding)
    new_html = f"""
    <div class="0buck-truth-engine-v6" style="max-width: 800px; margin: 0 auto; line-height: 1.6; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        
        <!-- 1. 100% CASHBACK BADGE (High Visibility) -->
        <div style="background: #000; color: #fff; padding: 18px; border-radius: 12px; margin-bottom: 25px; border-left: 6px solid #FFD700; display: flex; align-items: center; gap: 15px;">
            <div style="font-size: 24px;">🔥</div>
            <div>
                <p style="margin: 0; font-weight: 900; font-size: 18px; letter-spacing: 0.5px; color: #FFD700;">100% CASHBACK ELIGIBLE</p>
                <p style="margin: 3px 0 0; font-size: 13px; opacity: 0.9;">Unlock a full rebate of ${price} via our 20-Phase Artisan Journey.</p>
            </div>
        </div>

        <!-- 2. MARKET EFFICIENCY AUDIT -->
        <div style="background: #f8f8f8; border: 1px solid #eee; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <p style="margin: 0 0 15px; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1px;">Market Efficiency Audit</p>
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="flex: 1;">
                    <span style="color: #999; font-size: 11px;">Amazon Reference</span><br>
                    <span style="text-decoration: line-through; color: #bbb; font-size: 18px;">${round(float(price)/0.6, 2)}</span>
                </div>
                <div style="flex: 1; text-align: right;">
                    <span style="color: #000; font-size: 11px; font-weight: 600;">0Buck Artisan Value</span><br>
                    <span style="color: #000; font-size: 28px; font-weight: 900;">${price}</span>
                </div>
            </div>
            <p style="margin-top: 12px; color: #008a00; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 5px;">
                <span>✓</span> Truth Pricing Locked: Direct Sourcing Protocol
            </p>
        </div>

        <!-- 3. TRUTH AUDIT: PHYSICAL SPECS (Mobile Standout) -->
        <div style="background: #fffbe6; border: 2px solid #ffe58f; padding: 18px; border-radius: 12px; margin-bottom: 25px;">
            <p style="margin: 0 0 8px; font-weight: 900; font-size: 15px; color: #856404; display: flex; align-items: center; gap: 8px;">
                <span>⚖️</span> TRUTH AUDIT: PHYSICAL SPECS
            </p>
            <p style="margin: 0; font-size: 15px; color: #514107; font-weight: 600; line-height: 1.4;">
                {spec_text}
            </p>
            <p style="margin: 8px 0 0; font-size: 11px; color: #b58105; opacity: 0.8;">Verified via 0Buck Industrial Standard v6.2.0</p>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 25px; margin-top: 10px;">
            <p style="font-size: 14px; color: #444;">We bypass brand tax by connecting you directly to verified artisan workshops. No middleman. No markups. Just the truth.</p>
        </div>

        <div style="background: #fafafa; border-radius: 12px; padding: 20px; margin-top: 40px; text-align: center; border: 1px solid #f0f0f0;">
            <p style="margin: 0; font-weight: 800; color: #000; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">🚀 Global Truth Fulfillment</p>
            <p style="margin-top: 15px; font-size: 11px; color: #bbb; letter-spacing: 0.5px;">Artisan Standard Certified | 0Buck v6.2.0 Pipeline</p>
        </div>
    </div>
    """
    
    url = f"{SHOP_URL}/products/{product_id}.json"
    headers = {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
        "Content-Type": "application/json"
    }
    payload = {"product": {"id": product_id, "body_html": new_html}}
    response = requests.put(url, headers=headers, json=payload)
    return response.status_code

# Fetch current products to get prices
for pid, spec in product_specs.items():
    url = f"{SHOP_URL}/products/{pid}.json"
    headers = {"X-Shopify-Access-Token": ACCESS_TOKEN}
    res = requests.get(url, headers=headers).json()
    product = res.get('product')
    if product:
        price = product['variants'][0]['price']
        print(f"Refining UX for {pid} ({product['title'][:30]}...) at price ${price}")
        update_product_description(pid, spec, price)
        time.sleep(0.5)
