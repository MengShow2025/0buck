import re

# List of brands to remove (v6.2.0 Sniper List)
BRANDS = [
    "Skechers", "Nautica", "Garmin", "Tracki", "PetSafe", "Fi", "Tractive", 
    "Pawfit", "Petivity", "MODUS", "BONSO", "Ztobny", "SEEWORLD", "PETLOC8", 
    "Fajocru", "Benarlee", "Waggle", "SpeedTalk", "Amcrest", "DBDD", "NORTIV 8",
    "PAJ GPS", "PetSafe", "Apple", "Samsung", "Purina", "Tapo", "GANOEL", 
    "Charles Wilson", "True Classic", "Clothe Co.", "ZOCANIA", "NORTIV8", 
    "Phoebe", "Amazon", "Google"
]

def clean_title(title: str) -> str:
    if not title:
        return "0Buck Verified Artisan Product"
        
    cleaned = title
    for brand in BRANDS:
        # Case-insensitive replacement
        pattern = re.compile(re.escape(brand), re.IGNORECASE)
        cleaned = pattern.sub("", cleaned)
    
    # Clean up extra spaces and punctuation
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    cleaned = re.sub(r'^[,\-\|\s]+|[,\-\|\s]+$', '', cleaned)
    
    # Fix typo in existing prefix
    if cleaned.startswith("0Buck Veried Artisan:"):
        cleaned = cleaned.replace("0Buck Veried Artisan:", "0Buck Verified Artisan:")
    
    # Add 0Buck Prefix
    if not cleaned.startswith("0Buck Verified Artisan:"):
        cleaned = f"0Buck Verified Artisan: {cleaned}"
    
    # If it's too short after cleaning, use the original without the specific brand word but keep the rest
    if len(cleaned) < 5 or cleaned == "0Buck Verified Artisan:":
        # Fallback: Just append "Product" or use a part of the original
        cleaned = f"{cleaned} Essential Gear"
    
    return cleaned
