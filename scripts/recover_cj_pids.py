
import json
import pg8000
import ssl
import urllib.parse as urlparse
from difflib import SequenceMatcher

# 1. DATABASE CONFIG
DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def similar(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def get_db_conn():
    url = urlparse.urlparse(DB_URL)
    return pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )

def recover_pids():
    print("🔍 Starting PID Recovery from cj_dump.json...")
    
    # Load CJ Dump
    with open("/Volumes/SAMSUNG 970/AccioWork/coder/0buck/cj_dump.json", "r") as f:
        cj_data = json.load(f)
    
    conn = get_db_conn()
    cur = conn.cursor()
    
    # Get synced products
    cur.execute("SELECT id, title_en FROM candidate_products WHERE status = 'synced' AND cj_pid IS NULL")
    db_products = cur.fetchall()
    print(f"📦 Found {len(db_products)} disconnected products in DB.")
    
    matched_count = 0
    for db_id, db_title in db_products:
        if not db_title: continue
        
        # Clean title (remove "0Buck Verified Artisan" etc)
        clean_title = db_title.split("|")[0].strip().replace("0Buck Verified Artisan:", "").strip()
        
        best_match = None
        highest_score = 0
        
        for cj_item in cj_data:
            cj_title = cj_item.get("nameEn")
            if not cj_title: continue
            
            score = similar(clean_title, cj_title)
            if score > highest_score:
                highest_score = score
                best_match = cj_item
        
        # Threshold for match
        if highest_score > 0.8:
            cj_pid = best_match["id"]
            cur.execute("UPDATE candidate_products SET cj_pid = %s WHERE id = %s", (cj_pid, db_id))
            conn.commit()
            matched_count += 1
            print(f"   ✅ Matched ID {db_id}: {clean_title[:30]} -> CJ PID {cj_pid} (Score: {highest_score:.2f})")
        else:
            print(f"   ❌ No match for ID {db_id}: {clean_title[:30]} (Best: {highest_score:.2f})")
            
    conn.close()
    print(f"✨ PID Recovery Complete. Matched {matched_count} products.")

if __name__ == "__main__":
    recover_pids()
