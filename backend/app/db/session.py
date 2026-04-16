import ssl
import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Force print for debugging
print("!!! SESSION.PY LOADING !!!")

# Use environment variable directly as backup if settings is wonky
db_url = os.getenv("DATABASE_URL")
if not db_url:
    db_url = settings.SQLALCHEMY_DATABASE_URI

print(f"DEBUG: USING DATABASE URL: {db_url[:50]}...")

connect_args = {}
if db_url and "pg8000" in db_url:
    print("DEBUG: Setting up pg8000 ssl_context")
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args = {"ssl_context": ssl_context}

from sqlalchemy.pool import StaticPool
engine = create_engine(db_url, connect_args=connect_args, poolclass=StaticPool)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
