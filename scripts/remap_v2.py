
import json
import pg8000
import ssl
import urllib.parse as urlparse
from difflib import SequenceMatcher

DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def clean_title(title):
    if not title: return ""
    title = title.split("|")[0].strip()
    title = title.replace("0Buck Verified Artisan:", "").strip()
    title = title.replace("0Buck Verified", "").strip()
    return title.lower()

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

def remap():
    with open("/Volumes/SAMSUNG 970/AccioWork/coder/0buck/cj_dump.json", "r") as f:
        cj_data = json.load(f)
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    cur.execute("SELECT id, title_en FROM candidate_products WHERE source_platform_name = 'CJ'")
    candidates = cur.fetchall()
    
    matched = 0
    for c_id, raw_title in candidates:
        if not raw_title: continue
        target = clean_title(raw_title)
        target_words = set(target.split())
        
        best_match = None
        best_score = 0
        
        for item in cj_data:
            cj_title = (item.get("nameEn") or "").lower()
            if not cj_title: continue
            
            # Simple word overlap score
            cj_words = set(cj_title.split())
            overlap = len(target_words.intersection(cj_words))
            score = overlap / len(target_words) if target_words else 0
            
            if score > best_score:
                best_score = score
                best_match = item
        
        if best_score > 0.4: # Threshold
            cj_pid = best_match["id"]
            sku = best_match.get("sku")
            cur.execute("UPDATE candidate_products SET cj_pid = %s, variant_sku = %s WHERE id = %s", (cj_pid, sku, c_id))
            conn.commit()
            matched += 1
            print(f"✅ Matched ID {c_id}: '{target[:30]}' -> CJ {cj_pid} (Score: {best_score:.2f})")
            
    conn.close()
    print(f"🏁 Remapped {matched} products.")

if __name__ == "__main__":
    remap()
