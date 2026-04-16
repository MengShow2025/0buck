import json
import re

def clean_title(title, category):
    # Remove common brand tax markers and filler
    markers = [
        r'Compatible with\s*',
        r'for\s+iPhone\s*',
        r'Replacement for\s*',
        r'SRM 225\s*',
        r'Kohler\s*',
        r'Samsung\s*',
        r'Apple\s*',
        r'Sony\s*',
        r'HP\s*',
        r'Dell\s*',
        r'Logitech\s*',
        r'Nintendo\s*',
        r'Microsoft\s*',
        r'Google\s*',
        r'Amazon\s*',
        r'Screws\s+#\d+\s*X\s*\d+/\d+', # For that specific screw item
        r'\d+\s*Gallons?',
        r'\d+\s*in\s*1',
        r'\d+\s*pcs',
        r'\d+\s*Pack',
    ]
    
    cleaned = title
    for marker in markers:
        cleaned = re.sub(marker, '', cleaned, flags=re.IGNORECASE)
    
    # Strip leading/trailing punctuation and whitespace
    cleaned = cleaned.strip(' ,.-|()#')
    
    # Extract name part before comma or dash
    name_part = re.split(r'[,–\-]', cleaned)[0].strip()
    
    # If name is too short, take more
    if len(name_part.split()) < 2:
        parts = re.split(r'[,–\-]', cleaned)
        if len(parts) > 1:
            name_part = (parts[0] + " " + parts[1]).strip()

    # Core function extraction from category
    cat_parts = re.split(r'[>/]', category)
    core_fn = cat_parts[-1].strip() if cat_parts else "Verified Utility"
    if "Storage" in core_fn:
        core_fn = "Smart Organization"
    elif "Jewelry" in core_fn:
        core_fn = "Artisan Finery"
    elif "Chopper" in title:
        core_fn = "Kitchen Precision"
    
    # Construct final title
    return f"{name_part} | {core_fn} | 0Buck Verified Artisan"

def generate_description(item):
    title = item.get('title', '')
    category = item.get('category', 'Essentials')
    # Determine if it's a cashback item (based on profitRatio >= 4.0 or status)
    # The protocol says PROFIT: >= 4.0x (返现商品, 标记 "100% BACK")
    is_cashback = item.get('profitRatio', 0) >= 4.0 or item.get('productType') == 'CASHBACK'
    
    # Hook: Scenario-based pain point
    hook_templates = [
        "Still paying a 400% markup for a brand logo? The industry's best-kept secret is that quality doesn't come with a 'designer' price tag.",
        "Stop financing expensive TV ads and celebrity endorsements. You deserve the artisan's craftsmanship, not their marketing budget.",
        "Ever wondered why identical products have such different prices? It's the 'brand tax'—and we just abolished it.",
        "Your home deserves premium functionality without the premium markup. Luxury should be about quality, not the invoice."
    ]
    
    # Pick hook based on category
    if "Jewelry" in category:
        hook = "Why pay high-street prices for a brand box? We strip away the retail overhead and deliver the pure craftsmanship of 14K-inspired finery directly to your door."
    elif "Kitchen" in category:
        hook = "Meal prep is the foundation of a healthy life, but expensive gadgets are the foundation of retail greed. Get the precision of professional tools without the 'boutique' tax."
    elif "Storage" in category:
        hook = "A cluttered home leads to a cluttered mind. But why spend a fortune on plastic and wood just for a brand name? Get organized with factory-direct precision."
    else:
        # Use a random one from templates or just the first one
        hook = hook_templates[0]

    # Logic: Cost breakdown/Transparency
    logic = (
        "We've partnered with the exact same 'Verified Artisans' who manufacture for the world's leading brands. "
        "By cutting out the distributors, retail stores, and expensive advertising, we bring you the raw factory-direct "
        "value. 0Buck is the bridge between elite manufacturing and your everyday life."
    )
    
    # Closing: Ritual/Contract
    if is_cashback:
        closing = (
            "<strong>THE SIGNATURE 100% BACK CONTRACT:</strong> This isn't just a transaction; it's an investment. "
            "Complete our 20-phase check-in ritual, and we will return 100% of your payment in 0Buck Credits. "
            "Quality verified, cost eliminated."
        )
    else:
        closing = (
            "Join the 0Buck Verified Artisan movement. Transparent pricing, uncompromising quality, and the satisfaction "
            "of knowing you're paying for the product—not the fluff."
        )

    return f"<h3>[The Hook]</h3><p>{hook}</p><h3>[The Logic]</h3><p>{logic}</p><h3>[The Closing]</h3><p>{closing}</p>"

def main():
    try:
        with open('/Volumes/SAMSUNG 970/AccioWork/coder/0buck/shopify/drafts.json', 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading drafts.json: {e}")
        return
    
    for item in data:
        # Save original values for processing if needed
        orig_title = item.get('title', '')
        orig_category = item.get('category', '')
        
        # Polish Title
        item['title'] = clean_title(orig_title, orig_category)
        
        # Polish Description
        item['descriptionHtml'] = generate_description(item)
    
    try:
        with open('/Volumes/SAMSUNG 970/AccioWork/coder/0buck/shopify/drafts_polished.json', 'w') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully polished {len(data)} items.")
    except Exception as e:
        print(f"Error writing polished file: {e}")

if __name__ == "__main__":
    main()
