
import pg8000
import ssl
import urllib.parse as urlparse

DB_URL = "postgresql://neondb_owner:npg_MoQh4OvD1HKy@ep-lingering-smoke-amtrqzuh-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require"

def update_vanguard_pids():
    updates = [
        (18, "2039550609576448002"),
        (16, "1788875894695022592"),
        (13, "A81FD447-164B-4864-901D-7E5BFDD005D5"),
        (12, "2411130145161604100"),
        (14, "1381072330335326208"),
        (15, "2603160922571625000"),
        (20, "2501110956431609200"),
        (22, "1380072876270555136"),
        (23, "1542015066114109440"),
        (24, "2602090139071618500"),
        (25, "C052557E-53D7-43DB-8F7F-B1DC911A1DDB"),
        (19, "1705207519641083904")
    ]

    url = urlparse.urlparse(DB_URL)
    conn = pg8000.connect(
        user=url.username, password=url.password, host=url.hostname, port=url.port or 5432,
        database=url.path[1:], ssl_context=ssl.create_default_context()
    )
    cur = conn.cursor()

    for pid_id, cj_pid in updates:
        cur.execute("UPDATE candidate_products SET cj_pid = %s WHERE id = %s", (cj_pid, pid_id))
        print(f"Updated ID {pid_id} with PID {cj_pid}")

    conn.commit()
    conn.close()
    print("Database update completed.")

if __name__ == "__main__":
    update_vanguard_pids()
