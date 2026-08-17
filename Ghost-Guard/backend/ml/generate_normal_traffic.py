import numpy as np
import pandas as pd


def _clip_normal(loc, scale, size, lo, hi):
    values = np.random.normal(loc=loc, scale=scale, size=size)
    return np.clip(values, lo, hi)


def generate_normal_traffic(n_samples=1000):
    """
    Build the Isolation Forest's baseline of normal traffic.

    Traffic is generated as separate, realistic behavior profiles per known
    endpoint - rate/payload/method are correlated with the endpoint they
    actually occur on, instead of being sampled independently. This matters
    because ChatX's real usage pattern (frequent small GET polls, occasional
    POST sends) looks nothing like generic browsing traffic on /api/products
    or /api/profile, and previously wasn't represented at all.

    Endpoint encoding (must match ml/model.py's encode_endpoint):
      0 = /api/products
      1 = /api/profile
      2 = /messages   (ChatX: GET polling + POST sending)
      3 = other/unknown (honeypot decoys, scanning, everything else)
    """
    np.random.seed(42)

    blocks = []

    # --- /api/products browsing (GET-heavy, light payload) -----------------
    n = int(n_samples * 0.30)
    blocks.append(pd.DataFrame({
        "request_rate": _clip_normal(1.2, 0.5, n, 0.1, 5),
        "payload_size": _clip_normal(0, 5, n, 0, 50),
        "endpoint_encoded": 0,
        "method_encoded": np.random.choice([0, 1], size=n, p=[0.9, 0.1]),
    }))

    # --- /api/profile browsing (GET-heavy, light payload) -------------------
    n = int(n_samples * 0.15)
    blocks.append(pd.DataFrame({
        "request_rate": _clip_normal(1.0, 0.5, n, 0.1, 5),
        "payload_size": _clip_normal(0, 5, n, 0, 50),
        "endpoint_encoded": 1,
        "method_encoded": np.random.choice([0, 1], size=n, p=[0.9, 0.1]),
    }))

    # --- /messages: GET polling (dominant ChatX traffic pattern) -----------
    # ChatX polls on a steady ~2-3s interval, so the request_rate feature
    # (requests/sec measured over a 10s rolling window) sits low and steady.
    n = int(n_samples * 0.35)
    blocks.append(pd.DataFrame({
        "request_rate": _clip_normal(0.4, 0.15, n, 0.1, 2.0),
        "payload_size": _clip_normal(0, 3, n, 0, 20),   # GET has no body
        "endpoint_encoded": 2,
        "method_encoded": 0,  # GET
    }))

    # --- /messages: POST sending (occasional, encrypted payload) -----------
    # Body is JSON containing conversationId/senderName/ciphertext/iv - a
    # short encrypted chat message base64-encoded, so a modest payload size.
    n = int(n_samples * 0.15)
    blocks.append(pd.DataFrame({
        "request_rate": _clip_normal(0.35, 0.15, n, 0.1, 2.0),
        "payload_size": _clip_normal(250, 150, n, 50, 900),
        "endpoint_encoded": 2,
        "method_encoded": 1,  # POST
    }))

    # --- small slice of "other" traffic (rare, legitimately unclassified) --
    n = n_samples - sum(len(b) for b in blocks)
    blocks.append(pd.DataFrame({
        "request_rate": _clip_normal(0.8, 0.4, n, 0.1, 3),
        "payload_size": _clip_normal(20, 15, n, 0, 150),
        "endpoint_encoded": 3,
        "method_encoded": np.random.choice([0, 1], size=n, p=[0.8, 0.2]),
    }))

    df = pd.concat(blocks, ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)  # shuffle

    return df


if __name__ == "__main__":
    df = generate_normal_traffic()
    df.to_csv("ml/normal_traffic.csv", index=False)
    print(f"Generated {len(df)} normal traffic samples")
    print(df.describe())
    print(df.groupby("endpoint_encoded").size())