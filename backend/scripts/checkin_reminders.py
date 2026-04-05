import asyncio
import os
import sys
from datetime import datetime

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.services.social_automation import SocialAutomationService

async def main():
    """
    Cron Task: Send check-in reminders to users who have not checked in yet.
    Usually runs every 60 minutes.
    """
    db = SessionLocal()
    try:
        social_service = SocialAutomationService(db)
        print(f"[{datetime.now()}] Starting Daily Check-in Reminder scan...")
        
        count = await social_service.send_checkin_reminders()
        
        print(f"[{datetime.now()}] Scan complete. Sent {count} reminders.")
    except Exception as e:
        print(f"Error in Check-in Reminder Cron: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
