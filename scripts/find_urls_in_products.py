import pg8000
import os
import ssl
import urllib.parse as urlparse

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def find_urls_in_products():
    try:
        url = urlparse.urlparse(DATABASE_URL)
        conn = pg8000.connect(
            user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
            database=url.path[1:], ssl_context=ssl.create_default_context()
        )
        cur = conn.cursor()
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'products';")
        cols = [r[0] for r in cur.fetchall()]
        print(f"Products Columns: {cols}")
        
        # Look for columns that might have URLs
        url_cols = [c for c in cols if 'url' in c or 'link' in c]
        if url_cols:
            query = f"SELECT id, {', '.join(url_cols)} FROM products LIMIT 5;"
            cur.execute(query)
            rows = cur.fetchall()
            for row in rows:
                print(f"Row: {row}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_urls_in_products()
