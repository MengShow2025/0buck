import os, sys, json, requests, re
from decimal import Decimal

# Truth Engine v6.2.0: Amazon to Shopify Sync Script
# Core Logic: Targeted Sourcing + Brand Cleaning + Tactical Pricing

def clean_brand_names(title):
    # Standard 0Buck Sniper List
    BRANDS = [
        "Skechers", "Nautica", "Garmin", "Tracki", "PetSafe", "Fi", "Tractive", 
        "Pawfit", "Petivity", "MODUS", "BONSO", "Ztobny", "SEEWORLD", "PETLOC8", 
        "Fajocru", "Benarlee", "Waggle", "SpeedTalk", "Amcrest", "DBDD", "NORTIV 8",
        "PAJ GPS", "PetSafe", "Apple", "Samsung", "Purina", "Tapo", "GANOEL", 
        "Charles Wilson", "True Classic", "Clothe Co.", "ZOCANIA", "NORTIV8", 
        "Phoebe", "Amazon", "Google"
    ]
    cleaned = title
    for brand in BRANDS:
        pattern = re.compile(re.escape(brand), re.IGNORECASE)
        cleaned = pattern.sub("", cleaned)
    
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    cleaned = re.sub(r'^[,\-\|\s]+|[,\-\|\s]+$', '', cleaned)
    
    if not cleaned.startswith("0Buck Verified Artisan:"):
        cleaned = f"0Buck Verified Artisan: {cleaned}"
    return cleaned

def calculate_tactical_price(amazon_anchor, landed_cost):
    """v6.2.0 Truth Engine Formula: Max(Amazon * 0.6, Landed_Cost * 1.5)"""
    target_06 = float(round(Decimal(str(amazon_anchor)) * Decimal("0.6"), 2))
    target_roi = float(round(Decimal(str(landed_cost)) * Decimal("1.5"), 2))
    return max(target_06, target_roi)

def sync_to_shopify(payload):
    # This matches the production logic in auto_cj_uploader.py
    # ... (Actual implementation would call Shopify Admin API)
    pass

if __name__ == "__main__":
    print("🚀 0Buck v6.2.0 Truth Engine Sync Module Initialized.")
    # Example usage:
    original_title = "Skechers Men's Go Walk Evolution Ultra"
    amazon_anchor = 89.99
    landed_cost = 25.40
    
    clean_title = clean_brand_names(original_title)
    final_price = calculate_tactical_price(amazon_anchor, landed_cost)
    
    print(f"   Original: {original_title}")
    print(f"   Cleaned:  {clean_title}")
    print(f"   Price:    ${final_price} (Targeted ROI & 0.6 Rule)")
