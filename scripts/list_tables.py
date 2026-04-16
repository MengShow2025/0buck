import pg8000
import os
import ssl
import urllib.parse as urlparse

DATABASE_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def list_tables():
    try:
        url = urlparse.urlparse(DATABASE_URL)
        conn = pg8000.connect(
            user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
            database=url.path[1:], ssl_context=ssl.create_default_context()
        )
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        rows = cur.fetchall()
        for row in rows:
            print(row[0])
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_tables()
