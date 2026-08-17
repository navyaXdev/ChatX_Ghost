# Ghost Guard

**Behavior-based adaptive API defense — detects unknown attack patterns without predefined signatures, and contains them in a deceptive honeypot layer.**

Traditional security tools rely on known signatures — if an attack pattern isn't in the rulebook, it slips through. Ghost Guard takes a different approach: it learns what *normal* traffic to an API looks like, using an unsupervised ML model (Isolation Forest) trained only on normal behavior. Any request that deviates from that learned baseline — regardless of whether the specific attack pattern has ever been seen before — is flagged and silently redirected to a honeypot, where the attacker's behavior is observed and logged instead of touching the real system.

---

## How It Works

```
Request → Feature extraction → Isolation Forest scoring → Routing decision
                                                              ├── Normal → Real API
                                                              └── Anomalous → Honeypot → Behavior logged
```

Every incoming request is scored on:
- **Request rate** — requests per second from the same source, over a rolling 10-second window
- **Payload size** — size of the request body
- **Endpoint pattern** — which route is being accessed
- **HTTP method** — GET vs POST distribution

The model was trained exclusively on synthetic *normal* traffic — it was never shown any attack examples. Detection is therefore behavioral, not pattern-matched: a brand-new attack technique can still be caught if its behavior deviates from the learned baseline, without needing to hardcode what that attack looks like.

Requests classified as anomalous are routed to a parallel honeypot layer of fake endpoints (`/admin`, `/admin/users`, `/admin/database`, `/login`) that return believable but fake data. The real API and its data are never touched. Every honeypot interaction is logged and grouped into sessions by source IP for later review.

## Decision Model

| Decision | Meaning |
|---|---|
| **normal** | Request behavior is consistent with the learned baseline — passed through to the real API |
| **honeypot** | Request behavior deviates from baseline (or targets a known-sensitive endpoint) — silently routed to fake endpoints, source IP and actions logged |

A structural safety net also flags any request to a route outside the known-safe real-API endpoints, regardless of ML score, to guard against edge cases where the behavioral signal alone is inconclusive.

## Features

- **Signature-free anomaly detection** — Isolation Forest trained only on normal traffic, no attack labels required
- **Honeypot containment** — anomalous requests are silently redirected to fake endpoints instead of being simply blocked
- **Explainability** — every honeypot decision includes human-readable reasons (e.g. "Request rate above baseline", "Unrecognized endpoint pattern")
- **Session tracking** — honeypot interactions are grouped by source IP into sessions showing the attacker's full action sequence
- **Adaptive threat level** — dashboard-facing status escalates from `low` → `medium` → `high` based on the proportion of honeypot-routed traffic
- **Live dashboard API** — polling-based endpoints (`/events`, `/status`, `/honeypot-log`) built for a ~2 second refresh interval

## Tech Stack

**Backend**
- Python, Flask, flask-cors
- scikit-learn (Isolation Forest)
- SQLite (request/event logging)
- gunicorn (production serving)

**Frontend**
- See [`frontend/README.md`](./frontend/README.md) for the dashboard's stack and setup.

## Project Structure

```
Ghost-Guard/
├── backend/
│   ├── app.py                      # Flask app entrypoint, blueprint registration
│   ├── config.py
│   ├── requirements.txt
│   ├── Procfile                    # Render deployment (gunicorn)
│   ├── .gitignore
│   │
│   ├── core/
│   │   ├── feature_extractor.py    # Extracts request-rate, payload size, method, endpoint
│   │   ├── middleware.py           # before_request/after_request hooks — logs every request
│   │   └── router.py               # Decides normal vs honeypot based on ML score
│   │
│   ├── ml/
│   │   ├── generate_normal_traffic.py  # Synthetic "normal" traffic generator
│   │   ├── train_model.py              # Trains Isolation Forest on normal traffic only
│   │   ├── model.py                    # Loads model, scores incoming requests
│   │   └── models/
│   │       └── isolation_forest.joblib # Trained model artifact
│   │
│   ├── real_api/
│   │   └── routes.py                # Demo "real" endpoints: /api/products, /api/profile
│   │
│   ├── honeypot/
│   │   ├── routes.py                 # Fake endpoints: /admin, /admin/users, /admin/database, /login
│   │   └── fake_data.py              # Pre-seeded believable fake responses
│   │
│   ├── logging_db/
│   │   ├── schema.sql                # requests table schema
│   │   └── db.py                     # DB connection, insert/query helpers
│   │
│   ├── api/
│   │   └── dashboard_routes.py       # /events, /status, /honeypot-log
│   │
│   └── explainability/
│       └── explain.py                # Generates human-readable reasons for flagged requests
│
├── frontend/                        # See frontend/README.md
│
└── test_scripts/
    ├── normal_traffic.py            # Simulates realistic normal usage
    └── attack_simulation.py         # Simulates endpoint scraping + rapid-fire burst attack
```

## Getting Started (Backend)

### Prerequisites
- Python 3.10+
- pip

### Setup

```bash
git clone https://github.com/navyaXdev/Ghost-Guard.git
cd Ghost-Guard/backend
pip install -r requirements.txt
```

### Train the model

The trained model file may not be present after a fresh clone (large binary artifacts are typically excluded from version control). Generate it locally:

```bash
python -m ml.train_model
```

This creates `ml/models/isolation_forest.joblib`.

### Run the server

```bash
python app.py
```

The backend starts on `http://127.0.0.1:5000`.

### Verify it's working

```bash
curl http://127.0.0.1:5000/health
```

Expected response: `{"status": "alive"}`

## API Reference

### Dashboard Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/status` | Aggregate request counts and current threat level |
| `GET` | `/events` | Most recent 50 requests, with decision, score, and reasons |
| `GET` | `/honeypot-log` | Honeypot sessions grouped by source IP |
| `GET` | `/health` | Basic server health check |

### Real API (demo, always allowed unless flagged)

| Method | Endpoint |
|---|---|
| `GET` | `/api/products` |
| `GET` | `/api/profile` |

### Honeypot (fake, targeted at anomalous/probing traffic)

| Method | Endpoint |
|---|---|
| `GET` | `/admin` |
| `GET` | `/admin/users` |
| `GET` | `/admin/database` |
| `POST` | `/login` |

## Testing the Detection Pipeline

Two scripts simulate realistic traffic against a locally running backend:

```bash
# Terminal 1 — start the server
cd backend
python app.py

# Terminal 2 — simulate normal usage (builds a baseline)
cd ..
python test_scripts/normal_traffic.py

# Terminal 3 — simulate an attack
python test_scripts/attack_simulation.py
```

Then check classification results:

```bash
curl http://127.0.0.1:5000/status
curl http://127.0.0.1:5000/honeypot-log
```

## Known Limitations (Scoped for Hackathon Timeline)

- **Single-node, application-layer honeypot** — no OS-level process isolation or network segmentation; containment is at the HTTP-routing level only.
- **In-memory rate tracking** — request-rate features are tracked in-process and reset on server restart.
- **SQLite on Render's free tier is ephemeral** — data does not persist across redeploys. This is a known, disclosed trade-off, not an oversight.
- **Honeypot session grouping is IP-based only**, without time-window splitting — a returning source on a different day would currently be grouped into the same session.
- **Detection includes a structural safety net** alongside the ML signal for known-sensitive routes, as a defense-in-depth measure — not purely signature-free in the strictest sense, by design.

## Deployment

Backend is deployed on Render (Flask + gunicorn, `Procfile` included). Frontend deployment details are in `frontend/README.md`.