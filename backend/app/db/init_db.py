import os
import sys
from sqlalchemy import create_engine
from backend.app.models import Base
from backend.app.core.config import settings

def init_db():
    print(f"Connecting to {settings.SQLALCHEMY_DATABASE_URI}...")
    try:
        engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
        Base.metadata.create_all(bind=engine)
        print("Successfully created all tables in PostgreSQL.")
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        print("Note: If PostgreSQL is not running yet, this is expected. The models are ready for deployment.")

if __name__ == "__main__":
    init_db()
