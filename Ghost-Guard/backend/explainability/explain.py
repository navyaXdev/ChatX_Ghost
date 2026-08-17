NORMAL_RATE_MEAN = 1.5
NORMAL_PAYLOAD_MEAN = 100

KNOWN_ENDPOINTS = ["/api/products", "/api/profile", "/health", "/messages"]

def get_reasons(features, anomaly_score):
    reasons = []

    if features["request_rate"] > NORMAL_RATE_MEAN * 3:
        reasons.append(f"Request rate {features['request_rate']:.1f}x above typical baseline")

    if features["payload_size"] > NORMAL_PAYLOAD_MEAN * 3:
        reasons.append("Payload size significantly larger than typical requests")

    if features["endpoint"] not in KNOWN_ENDPOINTS:
        reasons.append(f"Unrecognized endpoint pattern: {features['endpoint']}")

    if not reasons and anomaly_score >= 45:
        reasons.append("Overall request pattern deviates from learned normal behavior")

    return reasons