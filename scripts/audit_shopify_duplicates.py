import os
import sys
from collections import defaultdict

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify

load_dotenv()

def audit_shopify_duplicates():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    print("🔍 v7.3 Deduplication Firewall: Auditing Shopify Store for Duplicates...")
    
    all_products = []
    page = shopify.Product.find(limit=250)
    all_products.extend(page)
    
    while page.has_next_page():
        page = page.next_page()
        all_products.extend(page)
    
    print(f"Total Products Found: {len(all_products)}")
    
    handle_map = defaultdict(list)
    title_map = defaultdict(list)
    sku_map = defaultdict(list)
    
    for p in all_products:
        handle_map[p.handle].append(p.id)
        title_map[p.title.lower().strip()].append(p.id)
        for v in p.variants:
            if v.sku:
                sku_map[v.sku].append(p.id)
                
    duplicates = {
        "by_handle": {h: ids for h, ids in handle_map.items() if len(ids) > 1},
        "by_title": {t: ids for t, ids in title_map.items() if len(ids) > 1},
        "by_sku": {s: ids for s, ids in sku_map.items() if len(set(ids)) > 1}
    }
    
    print("\n--- DUPLICATE REPORT ---")
    
    found_any = False
    if duplicates["by_handle"]:
        found_any = True
        print("\n[!] Duplicates by Handle:")
        for h, ids in duplicates["by_handle"].items():
            print(f"  - Handle: {h} -> IDs: {ids}")
            
    if duplicates["by_sku"]:
        found_any = True
        print("\n[!] Duplicates by SKU:")
        for s, ids in duplicates["by_sku"].items():
            print(f"  - SKU: {s} -> Product IDs: {list(set(ids))}")

    if not found_any:
        print("\n✅ No duplicates found based on Handle or SKU.")
    else:
        print("\n⚠️ Action Required: Use scripts/cleanup_duplicates.py to remove old versions.")

    return duplicates

if __name__ == "__main__":
    audit_shopify_duplicates()
