import joblib
import os
import numpy as np
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "isolation_forest.joblib")

_model = None

def load_model():
    global _model
    if _model is None:
        _model = joblib.load(MODEL_PATH)
    return _model

def encode_endpoint(endpoint):
    # Must stay in sync with ml/generate_normal_traffic.py's block encoding.
    if "products" in endpoint:
        return 0
    elif "profile" in endpoint:
        return 1
    elif endpoint == "/messages":
        return 2
    else:
        return 3

def encode_method(method):
    return 0 if method == "GET" else 1


def score_request(features):
    model = load_model()

    encoded = pd.DataFrame([{
        "request_rate": features["request_rate"],
        "payload_size": features["payload_size"],
        "endpoint_encoded": encode_endpoint(features["endpoint"]),
        "method_encoded": encode_method(features["method"])
    }])

    raw_score = model.decision_function(encoded)[0]
    anomaly_score = int(np.clip((0.5 - raw_score) * 100, 0, 100))
    is_anomalous = model.predict(encoded)[0] == -1

    return anomaly_score, is_anomalous