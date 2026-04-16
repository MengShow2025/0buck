import os
import ssl
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def cleanup_database():
    load_dotenv('backend/.env')
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found in .env")
        return

    # Convert to pg8000 and remove query params that might conflict
    base_url = db_url.split('?')[0]
    pg_url = base_url.replace('postgresql://', 'postgresql+pg8000://')
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    engine = create_engine(pg_url, connect_args={'ssl_context': ssl_context})
    with engine.connect() as connection:
        query = text("""
            UPDATE candidate_products 
            SET is_melted = FALSE, melt_reason = NULL 
            WHERE is_melted = TRUE AND (melt_reason IS NULL OR melt_reason = '')
        """)
        result = connection.execute(query)
        connection.commit()
        print(f"Reset {result.rowcount} products.")

if __name__ == "__main__":
    cleanup_database()
