CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    source_ip TEXT NOT NULL,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    payload_size INTEGER,
    request_rate REAL,
    anomaly_score REAL,
    decision TEXT NOT NULL,
    reasons TEXT
);