import os
import sys
import json
import asyncio
from sqlalchemy import create_engine, text

# Add custom packages path first
sys.path.insert(0, '/tmp/v7_packages_311')

DATABASE_URL = "postgresql://neondb_owner:npg_0XasvoqHEz4Y@ep-still-voice-amdeu23b-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

RAINFOREST_API_KEY = "27994945D3184575A48F73B8CCBC44DB"

def setup_v7_rainforest_config():
    """
    Securely inject Rainforest API Key and upgrade Sourcing logic.
    """
    print("🔐 Truth Engine: Injecting Rainforest API Key...")
    
    # Store in env file or a secure config table
    with open(".env", "a") as f:
        f.write(f"\nRAINFOREST_API_KEY={RAINFOREST_API_KEY}\n")
    
    print("✅ Rainforest API Key secured in .env (for Backend services)")

def upgrade_v7_1_radar():
    """
    High-frequency monitor & Melting Logic upgrade.
    """
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("🛠️ Upgrading Monitor Radar: Adding high-freq monitoring flags...")
        try:
            conn.execute(text("ALTER TABLE products ADD COLUMN last_monitored_at TIMESTAMP"))
            conn.execute(text("ALTER TABLE products ADD COLUMN monitor_freq_minutes INT DEFAULT 60"))
            conn.commit()
            print("   ✅ Monitor flags added.")
        except Exception as e:
            if "already exists" not in str(e):
                print(f"   ❌ Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    setup_v7_rainforest_config()
    upgrade_v7_1_radar()
