from flask import request, g
from datetime import datetime, timezone
from core.feature_extractor import extract_features
from core.router import route_request
from explainability.explain import get_reasons
from logging_db.db import insert_request

EXCLUDED_PATHS = ["/health", "/events", "/status", "/honeypot-log"]

def register_middleware(app):
    @app.before_request
    def log_request():
        if request.path in EXCLUDED_PATHS or request.method == "OPTIONS":
            return

        features = extract_features(request)
        anomaly_score, decision = route_request(features)
        reasons = get_reasons(features, anomaly_score) if decision == "honeypot" else []

        g.features = features
        g.timestamp = datetime.now(timezone.utc).isoformat()
        g.anomaly_score = anomaly_score
        g.decision = decision
        g.reasons = reasons

    @app.after_request
    def save_log(response):
        if hasattr(g, "features"):
            insert_request(
                timestamp=g.timestamp,
                source_ip=g.features["source_ip"],
                method=g.features["method"],
                endpoint=g.features["endpoint"],
                payload_size=g.features["payload_size"],
                request_rate=g.features["request_rate"],
                anomaly_score=g.anomaly_score,
                decision=g.decision,
                reasons=g.reasons
            )
        return response