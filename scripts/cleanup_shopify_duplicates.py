import os
import sys
from collections import defaultdict

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

from dotenv import load_dotenv
import shopify

load_dotenv()

def cleanup_shopify_duplicates():
    shop_url = os.getenv("SHOPIFY_SHOP_NAME") + ".myshopify.com"
    access_token = os.getenv("SHOPIFY_ACCESS_TOKEN")
    api_version = "2024-01"
    
    session = shopify.Session(shop_url, api_version, access_token)
    shopify.ShopifyResource.activate_session(session)
    
    print("🧹 v7.3 Deduplication Firewall: Cleaning up Shopify Store...")
    
    all_products = []
    page = shopify.Product.find(limit=250)
    all_products.extend(page)
    
    while page.has_next_page():
        page = page.next_page()
        all_products.extend(page)
    
    print(f"Total Products Loaded: {len(all_products)}")
    
    # Group by SKU (from variants)
    sku_to_products = defaultdict(list)
    for p in all_products:
        skus = set()
        for v in p.variants:
            if v.sku:
                skus.add(v.sku)
        
        # If no SKU, use handle as fallback for grouping
        if not skus:
            sku_to_products[f"handle_{p.handle}"].append(p)
        else:
            for sku in skus:
                sku_to_products[sku].append(p)

    deleted_count = 0
    for sku, prods in sku_to_products.items():
        # Remove duplicates from the list (some products might have multiple SKUs)
        unique_prods = []
        seen_ids = set()
        for p in prods:
            if p.id not in seen_ids:
                unique_prods.append(p)
                seen_ids.add(p.id)
        
        if len(unique_prods) <= 1:
            continue
            
        print(f"\n[!] Duplicate Group for SKU/Key: {sku}")
        
        # Ranking logic:
        # 1. Has "Verified Artisan" in title
        # 2. Has "v7.2-verified" or "asset-lineage-locked" tag
        # 3. Newest ID
        
        def rank_product(p):
            score = 0
            if "Verified Artisan" in p.title:
                score += 1000
            
            tags = [t.strip() for t in (p.tags or "").split(",")]
            if "v7.2-verified" in tags or "asset-lineage-locked" in tags:
                score += 500
            
            # Use ID as tie-breaker (higher is newer)
            return (score, p.id)

        sorted_prods = sorted(unique_prods, key=rank_product, reverse=True)
        
        keep = sorted_prods[0]
        todelete = sorted_prods[1:]
        
        print(f"  KEEP:  {keep.id} | {keep.title}")
        for p in todelete:
            print(f"  DELETE: {p.id} | {p.title}")
            try:
                p.destroy()
                deleted_count += 1
            except Exception as e:
                print(f"    ❌ Failed to delete {p.id}: {e}")
                
    print(f"\n✨ Cleanup Complete. Total Products Deleted: {deleted_count}")

if __name__ == "__main__":
    cleanup_shopify_duplicates()
