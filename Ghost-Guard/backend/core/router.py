from ml.model import score_request

# The Isolation Forest already has its own learned anomaly boundary through
# model.predict().  Do not replace that learned boundary with an arbitrary
# score cutoff: that previously caused legitimate /messages traffic to be
# sent to the honeypot when its display score happened to be 45-49.
KNOWN_SAFE_ENDPOINTS = {
    "/api/products",
    "/api/profile",
    "/health",
    "/messages",
}

# Intentional honeypot bait routes. These are structural traps, not the main
# unknown-threat detector.
DECOY_ENDPOINTS = {
    "/admin",
    "/admin/users",
    "/admin/database",
    "/login",
}

UNKNOWN_ENDPOINT_PENALTY = 10


def route_request(features):
    anomaly_score, is_anomalous = score_request(features)
    endpoint = features["endpoint"]

    if endpoint in DECOY_ENDPOINTS:
        # A deliberate decoy is always contained.
        anomaly_score = max(anomaly_score, 90)
        decision = "honeypot"
    elif endpoint in KNOWN_SAFE_ENDPOINTS:
        # For legitimate endpoints, trust the Isolation Forest's learned
        # classification. The numeric score is telemetry, not a second
        # arbitrary threshold.
        decision = "honeypot" if is_anomalous else "normal"
    else:
        # Unknown paths get a small secondary structural signal, while the
        # learned behavioral detector remains primary.
        anomaly_score = min(100, anomaly_score + UNKNOWN_ENDPOINT_PENALTY)
        decision = "honeypot" if (is_anomalous or anomaly_score >= 60) else "normal"

    return anomaly_score, decision
