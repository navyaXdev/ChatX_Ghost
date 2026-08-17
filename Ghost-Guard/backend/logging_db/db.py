import sqlite3
import os
import json

DB_PATH = os.path.join(os.path.dirname(__file__), "ghostguard.db")
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row #naam se access kar sakte ho — row["timestamp"], row["decision"] — zyada readable aur error-resistant
    return conn


def init_db():
    conn = get_connection()
    with open(SCHEMA_PATH, "r") as f:
        conn.executescript(f.read()) #full file of SQL content are executed simultaneously
    conn.commit() #changes are permanently saved indide db
    conn.close()


def insert_request(timestamp, source_ip, method, endpoint,
                    payload_size, request_rate, anomaly_score,
                    decision, reasons):
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO requests
        (timestamp, source_ip, method, endpoint, payload_size,
         request_rate, anomaly_score, decision, reasons)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (timestamp, source_ip, method, endpoint, payload_size,
         request_rate, anomaly_score, decision, json.dumps(reasons))
    )
    conn.commit()
    conn.close()


def get_events(limit=50):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM requests ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()

    events = []
    for row in rows:
        events.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "source_ip": row["source_ip"],
            "method": row["method"],
            "endpoint": row["endpoint"],
            "score": row["anomaly_score"],
            "decision": row["decision"],
            "reasons": json.loads(row["reasons"]) if row["reasons"] else []
        })
    return events


def get_status():
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) FROM requests").fetchone()[0]
    normal = conn.execute(
        "SELECT COUNT(*) FROM requests WHERE decision = 'normal'"
    ).fetchone()[0]
    honeypot = conn.execute(
        "SELECT COUNT(*) FROM requests WHERE decision = 'honeypot'"
    ).fetchone()[0]
    conn.close()

    threat_level = "low"
    if total > 0:
        ratio = honeypot / total
        if ratio > 0.15:
            threat_level = "high"
        elif ratio > 0.05:
            threat_level = "medium"

    return {
        "total_requests": total,
        "normal_requests": normal,
        "honeypot_requests": honeypot,
        "current_threat_level": threat_level
    }

def get_honeypot_sessions():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM requests WHERE decision = 'honeypot' ORDER BY source_ip, id"
    ).fetchall()
    conn.close()

    sessions = {}
    session_counter = 1000

    for row in rows:
        ip = row["source_ip"]
        if ip not in sessions:
            session_counter += 1
            sessions[ip] = {
                "session_id": session_counter,
                "source_ip": ip,
                "started_at": row["timestamp"],
                "actions": []
            }
        sessions[ip]["actions"].append({
            "timestamp": row["timestamp"],
            "endpoint": row["endpoint"]
        })

    return list(sessions.values())