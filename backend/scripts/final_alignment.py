import sys
import os
import json
import re
import shopify
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.app.core.config import settings

def extract_offer_id(url):
    if not url:
        return None
    # Match offerId=... or the last part of the path if it's a direct link
    match = re.search(r'offerId=(\d+)', url)
    if match:
        return match.group(1)
    # Check for dj.1688.com style or other formats
    return None

def build_master_mapping():
    data_dir = '/Volumes/SAMSUNG 970/AccioWork/coder/0buck/data/1688/'
    mapping_files = ['smart_home.json', 'office_tech.json', 'outdoor.json']
    translation_file = 'translated_mapping.json'
    
    # 1. Load translations (Chinese -> English)
    with open(os.path.join(data_dir, translation_file), 'r', encoding='utf-8') as f:
        translations = json.load(f)
    
    # Reverse mapping: English Title -> Chinese Title
    en_to_zh = {}
    for zh, data in translations.items():
        en_to_zh[data['title_en']] = zh
        
    # 2. Load product data (Chinese Title -> 1688 Data)
    zh_to_1688 = {}
    for filename in mapping_files:
        path = os.path.join(data_dir, filename)
        if not os.path.exists(path):
            continue
        with open(path, 'r', encoding='utf-8') as f:
            products = json.load(f)
            for p in products:
                zh_title = p.get('title')
                if zh_title:
                    zh_to_1688[zh_title] = {
                        'id': extract_offer_id(p.get('product_url')),
                        'price': p.get('price')
                    }
                    
    return en_to_zh, zh_to_1688

def fix_all_shopify_metafields(limit=50):
    en_to_zh, zh_to_1688 = build_master_mapping()
    print(f"Built mapping for {len(en_to_zh)} English titles and {len(zh_to_1688)} Chinese products.")
    
    shop_url = f"{settings.SHOPIFY_SHOP_NAME}.myshopify.com"
    session = shopify.Session(shop_url, "2024-01", settings.SHOPIFY_ACCESS_TOKEN)
    shopify.ShopifyResource.activate_session(session)
    
    products = shopify.Product.find(limit=limit)
    print(f"Found {len(products)} products on Shopify.")
    
    success_count = 0
    fixed_count = 0
    skip_count = 0
    
    for sp in products:
        try:
            # 1. Clean Title
            clean_title = sp.title.replace("[0Buck] ", "").strip()
            print(f"  Checking {sp.title} -> Clean: '{clean_title}'")
            
            # 2. Match English to Chinese
            zh_title = en_to_zh.get(clean_title)
            if zh_title:
                print(f"    Matched EN -> ZH: {zh_title}")
            
            # 3. If not found, check if it's already a Chinese title
            if not zh_title and clean_title in zh_to_1688:
                zh_title = clean_title
                print(f"    Matched directly as ZH: {zh_title}")
            
            data_1688 = zh_to_1688.get(zh_title) if zh_title else None
            
            # 4. Extract 1688 ID and Price
            source_1688_id = data_1688['id'] if data_1688 else None
            original_cost = data_1688['price'] if data_1688 else None
            
            # Fallback to SKU
            if not source_1688_id:
                sku = sp.variants[0].sku if sp.variants else ""
                if sku and sku.startswith("1688-"):
                    source_1688_id = sku.replace("1688-", "")
            
            if not source_1688_id:
                print(f"  Skipping {sp.title}: No 1688 ID found in mapping or SKU.")
                skip_count += 1
                continue

            # Calculate buffered cost
            try:
                cost_cny = float(original_cost) if original_cost else 0.0
            except:
                cost_cny = 0.0
                
            buffered_rate = settings.EXCHANGE_RATE * (1 + settings.EXCHANGE_BUFFER)
            source_cost_usd = round(cost_cny * buffered_rate, 4)
            
            # Update Metafields
            target_mfs = [
                {"namespace": "0buck_sync", "key": "source_1688_id", "value": source_1688_id, "type": "single_line_text_field"},
                {"namespace": "0buck_sync", "key": "original_cost", "value": str(cost_cny), "type": "number_decimal"},
                {"namespace": "0buck_sync", "key": "source_cost_usd", "value": str(source_cost_usd), "type": "number_decimal"},
                {"namespace": "0buck_sync", "key": "last_sync_timestamp", "value": datetime.now().isoformat(), "type": "date_time"},
                {"namespace": "0buck_sync", "key": "is_reward_eligible", "value": "true", "type": "single_line_text_field"}
            ]
            
            for mf_data in target_mfs:
                sp.add_metafield(shopify.Metafield(mf_data))
                fixed_count += 1
            
            success_count += 1
            print(f"  Aligned {sp.title} (ID: {source_1688_id}, Cost: {cost_cny})")
            
        except Exception as e:
            print(f"  Error on {sp.title}: {str(e)}")
            
    shopify.ShopifyResource.clear_session()
    print(f"\nReport: {success_count} Aligned, {skip_count} Skipped, {fixed_count} Metafields touched.")

if __name__ == "__main__":
    fix_all_shopify_metafields()
