import pg8000
import os
import ssl
import urllib.parse as urlparse

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def find_urls():
    try:
        url = urlparse.urlparse(DATABASE_URL)
        conn = pg8000.connect(
            user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
            database=url.path[1:], ssl_context=ssl.create_default_context()
        )
        cur = conn.cursor()
        cur.execute("SELECT id, title_en, amazon_link, market_comparison_url FROM candidate_products WHERE amazon_link IS NOT NULL OR market_comparison_url IS NOT NULL;")
        rows = cur.fetchall()
        print(f"Found {len(rows)} products with links.")
        for row in rows:
            print(f"ID: {row[0]} | Title: {row[1]} | Link: {row[2] or row[3]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_urls()
