import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def cleanup_database():
    load_dotenv('backend/.env')
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("DATABASE_URL not found in .env")
        return

    # Handle the case where the URL might have options that SQLAlchemy/psycopg2 doesn't like directly
    # or ensure it's compatible.
    
    engine = create_engine(db_url)
    with engine.connect() as connection:
        # Reset products marked as melted without a reason
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
