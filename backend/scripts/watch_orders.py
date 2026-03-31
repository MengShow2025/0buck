import sqlite3
import time
from datetime import datetime

def watch_orders():
    db_path = "test.db"
    print(f"[{datetime.now()}] Monitoring {db_path} for new checkin_plans...")
    
    last_count = 0
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Initial count
        cursor.execute("SELECT COUNT(*) FROM checkin_plans")
        last_count = cursor.fetchone()[0]
        
        while True:
            cursor.execute("SELECT id, customer_id, order_id, reward_base, end_date FROM checkin_plans")
            rows = cursor.fetchall()
            current_count = len(rows)
            
            if current_count > last_count:
                new_plans = rows[last_count:]
                for plan in new_plans:
                    print(f"\n[{datetime.now()}] 🔔 NEW ORDER DETECTED!")
                    print(f"  Plan ID: {plan[0]}")
                    print(f"  Customer: {plan[1]}")
                    print(f"  Order ID: {plan[2]}")
                    print(f"  Reward Base: ${plan[3]}")
                    print(f"  End Date: {plan[4]}")
                last_count = current_count
            
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    watch_orders()
