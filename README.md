# Ghost Guard Integration Guide

*Reverse-engineered from the actual codebases in `ChatX-main`, `Ghost-Guard-main`, and the combined `ChatX_Ghost` bundle. Every claim below is tied to a real file/line in the uploaded projects — no field or behavior has been invented.*

---

## 1. Architecture Overview

### ChatX (the protected application)
- **Backend**: Flask app, `ChatX/backend/app.py`. SQLite storage via `ChatX/backend/db.py`. Runs on port `8000` in the integrated setup (`app.run(debug=True, port=8000)` at the bottom of `app.py` — the un-integrated `ChatX-main` version runs the same code on port `5000`, which is the tell that Ghost Guard has taken over port 5000).
- **Frontend**: React + Vite, entry `frontend/src/main.jsx`, pages under `frontend/src/pages/` (`MainPage.jsx`, `EnterUser.jsx`, `ChatPage.jsx`), routing guard in `frontend/src/route/ProtectedRoute.jsx`, chat state in `frontend/src/context/ChatProvider.jsx`.
- **API routes** (all in `backend/app.py`): `GET/POST/DELETE /messages`, `GET /health`. There is no separate router file — all routes are declared directly on the Flask `app` object.
- **Auth**: There is no server-side auth/session system in this codebase. `EnterUser.jsx` just captures a display name and a passphrase-derived key client-side (`frontend/src/utils/cyptoUtils.js`) for end-to-end message encryption; the backend never sees plaintext or credentials.
- **Config**: `ChatX/frontend/.env` → `VITE_CHATX_API`. No backend `.env` is used by ChatX itself.

### Ghost Guard (the security layer)
- **Backend entry**: `Ghost-Guard-main/backend/app.py` (Flask), port `5000`.
- **Detection/scoring**: `backend/core/feature_extractor.py` (turns a raw request into features) → `backend/ml/model.py` (Isolation Forest scoring) → `backend/core/router.py` (turns the score into a decision).
- **Honeypot**: `backend/honeypot/routes.py` (fake `/admin*` and `/login` endpoints) + `backend/honeypot/fake_data.py` (the decoy payloads they return).
- **Middleware/hook**: `backend/core/middleware.py`, registered via `register_middleware(app)` in `app.py`. This is a Flask `before_request`/`after_request` pair — it runs on *every* request Ghost Guard receives.
- **Storage**: SQLite, `backend/logging_db/db.py` + `backend/logging_db/schema.sql` (single `requests` table), file `backend/logging_db/ghostguard.db`.
- **Dashboard/SOC API**: `backend/api/dashboard_routes.py` → `/events`, `/status`, `/honeypot-log`.
- **Dashboard UI**: `frontend/src/page/Dashboard.jsx`, data layer in `frontend/src/api/ghostGuard.js` and `frontend/src/hooks/useGhostGuard.js` (React Query, polling every 2s).
- **Explainability**: `backend/explainability/explain.py` — produces human-readable reasons for a honeypot decision.
- **Decoy "real" API**: `backend/real_api/routes.py` — fake `/api/products` and `/api/profile` used purely as extra low-value bait/known-safe endpoints for the model, unrelated to ChatX.
- **The proxy (the actual integration mechanism)**: `backend/proxy/routes.py`. **This file exists only in the integrated `ChatX_Ghost` bundle — it is not present in the standalone `Ghost-Guard-main` repo.** It is the one piece of code that was written specifically to wire Ghost Guard to ChatX.

---

## 2. The Exact Integration Point

Ghost Guard is **not called out to** by ChatX. Instead, Ghost Guard is placed **in front of** ChatX as a reverse proxy, and ChatX's frontend was pointed at Ghost Guard instead of at ChatX's own backend. This is a fully backend-side, synchronous, request-path integration — there is no separate outbound "check this message" API call.

### Modification 1 — ChatX frontend now targets Ghost Guard

```text
File: ChatX/frontend/src/pages/ChatPage.jsx
Original responsibility: Send/poll encrypted chat messages directly to the ChatX backend.
What was added: The hardcoded backend URL was replaced with an env-driven URL.
Why: So the same frontend code can point at Ghost Guard's proxy instead of ChatX directly, with no code change required.
Integration point: line 8
```
Diff (non-integrated `ChatX-main` → integrated `ChatX_Ghost`):
```diff
- const CHATX_API = "https://chatx-pfs9.onrender.com/messages";
+ const CHATX_API = import.meta.env.VITE_CHATX_API || "http://127.0.0.1:5000/messages";
```

```text
File: ChatX/frontend/.env  (new file, integrated bundle only)
Original responsibility: n/a (did not exist in ChatX-main)
What was added: VITE_CHATX_API=http://127.0.0.1:5000/messages
Why: Points the frontend at Ghost Guard's port (5000), not ChatX's own port (8000).
Integration point: single env var, read by ChatPage.jsx via import.meta.env.
```

### Modification 2 — ChatX backend moved off port 5000

```text
File: ChatX/backend/app.py
Original responsibility: Serve /messages and /health directly on port 5000.
What was added: Nothing functional — only the port at the bottom of the file changed.
Why: Port 5000 needed to be freed for Ghost Guard, since the frontend now talks to Ghost Guard first.
Integration point: last line, app.run(debug=True, port=8000)
```
No routes, imports, or logic in ChatX's backend were changed. ChatX has **zero awareness** that Ghost Guard exists — this is the key design property that makes Ghost Guard reusable.

### Modification 3 — Ghost Guard gained a proxy blueprint (the real integration code)

```text
File: Ghost-Guard-main/backend/proxy/routes.py  (new file)
Original responsibility: n/a — did not exist in the standalone Ghost Guard repo.
What was added: A Flask blueprint (proxy_bp) exposing /messages with GET/POST/PUT/PATCH/DELETE, which either forwards the request to ChatX or returns a decoy response, depending on the security decision already attached to the request.
Why: This is what lets Ghost Guard sit transparently in front of any backend without that backend needing to change.
Integration point: registered in Ghost-Guard-main/backend/app.py via app.register_blueprint(proxy_bp)
```

```text
File: Ghost-Guard-main/backend/app.py
Original responsibility: Boot Flask, mount real_api, honeypot, and dashboard blueprints.
What was added: from proxy.routes import proxy_bp and app.register_blueprint(proxy_bp); also load_dotenv() moved to the very top of the file with a comment noting it must run before proxy.routes is imported (proxy/routes.py reads its target URL at import time).
Why: Makes the proxy blueprint active and ensures CHATX_BACKEND_URL is available before the module-level os.environ.get() call in proxy/routes.py runs.
Integration point: top of file (import order) and blueprint registration block.
```

- **Frontend-side or backend-side?** Backend-side. The only frontend change is a URL swap; all detection/routing/proxying logic lives in Ghost Guard's Flask backend.
- **Synchronous or asynchronous?** Synchronous. `core/middleware.py`'s `before_request` hook scores the request and stores the decision on Flask's `g` object *before* `proxy/routes.py`'s handler runs in the same request/response cycle. The browser gets one response either way.
- **What happens when Ghost Guard is unavailable?** The browser simply can't reach `http://127.0.0.1:5000` — there is no fallback path in the frontend to call ChatX (port 8000) directly. Effectively **fail-closed for the whole chat app**, since the frontend has no direct route to ChatX once `VITE_CHATX_API` points at Ghost Guard.
- **What happens when a request is considered malicious?** `proxy_bp.messages_gateway()` checks `g.decision`; if it's `"honeypot"`, it never contacts ChatX and instead returns a synthetic response via `_honeypot_response()` (empty list for GET, `{"status":"deleted"}` for DELETE, `{"status":"sent"}` for anything else) — see §5.
- **What happens to legitimate users?** `g.decision == "normal"` → `_forward_to_chatx("messages")` transparently proxies the request to `CHATX_BACKEND_URL` (`http://127.0.0.1:8000`) and relays ChatX's real status code and body back to the browser, with hop-by-hop and CORS headers stripped so Ghost Guard's own CORS handling isn't double-applied.

---

## 3. The API Connection (ChatX ⇄ Ghost Guard)

### Ghost Guard base URL
```env
# Ghost-Guard-main/backend/.env
CHATX_BACKEND_URL=http://127.0.0.1:8000
```
```env
# ChatX/frontend/.env
VITE_CHATX_API=http://127.0.0.1:5000/messages
```
- **Where configured**: `Ghost-Guard-main/backend/.env` (upstream target) and `ChatX/frontend/.env` (public-facing entry point).
- **Which var**: `CHATX_BACKEND_URL`, read in `Ghost-Guard-main/backend/proxy/routes.py`:
  `CHATX_BACKEND_URL = os.environ.get("CHATX_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")`. Default is used if the env var is absent, so it works even without a `.env` in a fresh clone.
- **Which file reads it**: `proxy/routes.py` only. Note the ordering dependency: `load_dotenv()` must execute (in `app.py`) before `proxy.routes` is imported, because the URL is read once at import time, not per-request.
- **How the request is constructed**: `_forward_to_chatx()` uses the `requests` library to replay the original method, query string (`request.args`), raw body (`request.get_data(cache=True)`), and a filtered header set (`_request_headers()`, which strips hop-by-hop and CORS-negotiation headers) against `f"{CHATX_BACKEND_URL}/{chatx_path}"`, with `timeout=10` and `allow_redirects=False`.
- **HTTP method**: Whatever the browser sent — GET, POST, PUT, PATCH, or DELETE (`proxy_bp.route("/messages", methods=[...])`).
- **Endpoint**: `/messages` only. This is the single route Ghost Guard proxies for ChatX in this integration.
- **Headers**: All original request headers minus `HOP_BY_HOP_HEADERS` and CORS-negotiation headers (`origin`, `access-control-request-method`, `access-control-request-headers`).
- **Request body**: Passed through byte-for-byte (`request.get_data(cache=True)`) — Ghost Guard does not parse or modify ChatX's JSON payload.
- **Response format**: Ghost Guard relays ChatX's exact `status_code` and `content`, with response headers filtered through `_response_headers()` (strips hop-by-hop, CORS, and `content-encoding` headers so the browser doesn't double-decode a gzip body).
- **Timeout**: 10 seconds (`timeout=10` in the `requests.request(...)` call).
- **Error handling**: `requests.RequestException` is caught in `messages_gateway()` and turned into `{"error": "ChatX backend unreachable", "detail": str(exc)}` with HTTP `502`.

### Actual API contract

This is **not** a "send message + get risk score" API — Ghost Guard doesn't call out to an external scoring service per request. All scoring happens in-process inside Ghost Guard's own `before_request` hook, using data extracted from the HTTP request itself, not a payload ChatX sends it. The only wire-level contract that exists is the proxied `/messages` endpoint below (ChatX's own contract, transparently relayed):

```http
POST /messages
Content-Type: application/json
```
Request (from `ChatX/backend/app.py`):
```json
{
  "conversationId": "string",
  "senderName": "string",
  "ciphertext": "string",
  "iv": "string"
}
```
Response (`201`):
```json
{
  "status": "sent"
}
```

```http
GET /messages?conversationId=<id>&since=<messageId>
```
Response (`200`), array of:
```json
{
  "messageId": 0,
  "senderName": "string",
  "ciphertext": "string",
  "iv": "string",
  "timestamp": 0
}
```

```http
DELETE /messages?conversationId=<id>
```
Response (`200`):
```json
{
  "status": "deleted"
}
```

Internally, Ghost Guard's *own* detection pipeline works on a features object it builds itself in `core/feature_extractor.py`:
```json
{
  "source_ip": "request.remote_addr",
  "method": "request.method",
  "endpoint": "request.path",
  "payload_size": "request.content_length or 0",
  "request_rate": "requests from this IP in the last 10s, capped at 10"
}
```
and produces `(anomaly_score: int 0-100, decision: "normal" | "honeypot")` from `core/router.py`. There is no `risk_score` / `is_suspicious` / `honeypot` / `action` JSON payload anywhere in the code — that shape does not exist in this codebase; the real fields are `anomaly_score` and `decision`, stored per-request in the `requests` table (`logging_db/schema.sql`).

---

## 4. Request Flow

```text
ChatX User
    ↓
ChatX Frontend (VITE_CHATX_API → http://127.0.0.1:5000/messages)
    ↓
Ghost Guard :5000  — before_request hook (core/middleware.py)
    ↓
feature_extractor.py → ml/model.py (Isolation Forest) → core/router.py
    ↓
g.decision = "normal" | "honeypot"   (stored on Flask's request context)
    ↓
 ┌─────────────────────────┬─────────────────────────────┐
 │        NORMAL            │          HONEYPOT            │
 ↓                           ↓
proxy/routes.py             proxy/routes.py
forwards to ChatX :8000     returns decoy JSON, never
                             touches ChatX
    ↓                           ↓
ChatX backend (real reply)   Synthetic reply
    ↓                           ↓
        after_request hook logs the outcome to ghostguard.db
    ↓
Response returned to the browser
```

1. **When is Ghost Guard triggered?** On every HTTP request Ghost Guard receives, via `before_request`, except paths in `EXCLUDED_PATHS = ["/health", "/events", "/status", "/honeypot-log"]` and `OPTIONS` preflights.
2. **Which ChatX endpoint triggers it?** All of them, indirectly — because the frontend's only entry point is `/messages` on Ghost Guard, `/messages` (GET/POST/DELETE) is what's actually exercised in this integration.
3. **What data is sent?** Nothing is "sent to" a separate detector — Ghost Guard derives features from the live Flask `request` object in the same process (source IP, method, path, payload size, rolling request rate).
4. **What does Ghost Guard analyze?** Request rate over a 10-second sliding window per source IP, payload size, HTTP method, and endpoint (`core/feature_extractor.py`).
5. **How is risk calculated?** `ml/model.py` runs a pre-trained scikit-learn `IsolationForest` (`ml/models/isolation_forest.joblib`) on `[request_rate, payload_size, endpoint_encoded, method_encoded]`; its `decision_function` output is rescaled to a 0–100 `anomaly_score`, and `model.predict()` gives a boolean `is_anomalous`. `core/router.py` then applies endpoint-aware rules on top (see §5) to reach the final `decision`.
6. **When does the honeypot activate?** Either the endpoint is a hardcoded decoy (`/admin`, `/admin/users`, `/admin/database`, `/login` → always honeypot), or the endpoint is unknown and the model flags it / pushes the score to ≥60, or (for known-safe endpoints like `/messages`) the Isolation Forest itself flags the request as anomalous.
7. **What response is returned?** For `/messages` under a honeypot decision: `_honeypot_response()` in `proxy/routes.py` — `[]` for GET, `{"status":"deleted"}` for DELETE, `{"status":"sent"}` for anything else (i.e., a *plausible-looking but fake* success, not an error, so the attacker doesn't realize they've been contained).
8. **How does ChatX react to that response?** ChatX never sees the request at all when it's routed to the honeypot — Ghost Guard fabricates the response itself and ChatX's backend is not called.
9. **What is stored/logged?** Every non-excluded request: timestamp, source IP, method, endpoint, payload size, request rate, anomaly score, decision, and (for honeypot decisions) human-readable `reasons` from `explainability/explain.py` — all written to the `requests` table via `logging_db/db.py`'s `insert_request()`, called from `after_request`.
10. **What does the SOC/admin dashboard show?** `Dashboard.jsx` polls three endpoints every 2s: `/status` (totals + `current_threat_level`: low/medium/high based on the honeypot-to-total ratio), `/events` (last 50 requests with score/decision/reasons), and `/honeypot-log` (requests grouped into synthetic per-IP "sessions" with an assigned `session_id` and an ordered list of actions/endpoints touched).

---

## 5. Honeypot Configuration

### Honeypot routes
- **Structural decoys** (always honeypot, defined in `honeypot/routes.py`, mounted directly on the Ghost Guard Flask app — not proxied to ChatX):
  - `GET /admin` → fake admin panel welcome message
  - `GET /admin/users` → `FAKE_USERS` (3 fabricated user records)
  - `GET /admin/database` → `FAKE_DB_INFO` (fake Postgres metadata)
  - `POST /login` → `FAKE_LOGIN_SUCCESS` (a fake JWT-looking token, clearly marked `.fake` in the payload)
- **Contained real route**: `/messages` — not a dedicated honeypot route, but the *real* ChatX endpoint, gated by `core/router.py`. When `g.decision == "honeypot"`, `_honeypot_response()` in `proxy/routes.py` fabricates a response instead of forwarding.

### Does `/messages` accept any conversation ID?
Yes — `conversationId` is never validated against a whitelist anywhere in the code (neither in ChatX's `app.py` nor in Ghost Guard's proxy). ChatX's SQL query filters by whatever string is passed (`WHERE conversationId = ?`), so:
```text
/messages?conversationId=C1
/messages?conversationId=C2
/messages?conversationId=ANY_ID
```
all work identically — the ID is just an opaque partition key used in a parameterized query. This is true whether the request is forwarded to real ChatX or contained by the honeypot; the honeypot's `_honeypot_response()` doesn't inspect `conversationId` at all, it just returns a canned shape based on HTTP method.

### Honeypot trigger condition
From `core/router.py`:
```text
DECOY_ENDPOINTS = {"/admin", "/admin/users", "/admin/database", "/login"}
KNOWN_SAFE_ENDPOINTS = {"/api/products", "/api/profile", "/health", "/messages"}
UNKNOWN_ENDPOINT_PENALTY = 10

- endpoint in DECOY_ENDPOINTS      → always honeypot (score forced to ≥90)
- endpoint in KNOWN_SAFE_ENDPOINTS → honeypot only if the Isolation Forest itself flags it anomalous
- otherwise (unknown endpoint)     → +10 penalty to the score; honeypot if model-anomalous OR score ≥ 60
```
A code comment in this file explicitly warns against replacing the model's learned boundary with an arbitrary score cutoff for known-safe endpoints, noting that doing so previously caused false-positive honeypot routing of legitimate `/messages` traffic — worth preserving if you extend this logic.

### Fake/decoy data
`honeypot/fake_data.py` — `FAKE_USERS`, `FAKE_DB_INFO`, `FAKE_LOGIN_SUCCESS` (see §2). Also `real_api/routes.py`'s `FAKE_PRODUCTS`, used as extra bait/known-safe traffic shape, unrelated to ChatX's real data.

### Logging / attacker identification / session tracking
- Every request (normal or honeypot) is logged with `source_ip` = `request.remote_addr` — this is the sole attacker identifier; there's no cookie/session-ID based tracking.
- `logging_db.get_honeypot_sessions()` groups all honeypot-decision rows **by IP**, assigns each first-seen IP a synthetic `session_id` (starting at 1001), and lists the ordered `endpoint`/`timestamp` actions taken — this is what powers the "attacker session replay" view on the dashboard.
- **Conversation ID handling**: not tracked separately by Ghost Guard at all — it's opaque to the security layer, only relevant to ChatX/its data model.
- **Alert/event creation**: implicit — any row with `decision = "honeypot"` in the `requests` table *is* the alert; there's no separate alerts table. `/events` and `/honeypot-log` both read from the same table with different filters/grouping.

---

## 6. Making the Honeypot Reusable Elsewhere

Generic env configuration actually supported by this codebase (do not add fields that don't exist in the code):
```env
# Ghost Guard's own port/behavior is not env-configurable in this codebase;
# these two are the only integration-relevant variables that exist.
CHATX_BACKEND_URL=http://localhost:8000   # rename conceptually to <YOUR_APP_BACKEND_URL>
VITE_BACKEND_URL=http://localhost:5000    # consumed by the dashboard frontend only
```
There is no `HONEYPOT_ENABLED` or `HONEYPOT_THRESHOLD` variable in the code — decoy endpoints and thresholds are hardcoded constants in `core/router.py` (`DECOY_ENDPOINTS`, `KNOWN_SAFE_ENDPOINTS`, `UNKNOWN_ENDPOINT_PENALTY`, the `60` cutoff). If you want those to be configurable, that's a real enhancement to make (see §11), not something already wired up.

```text
Application
    ↓
Ghost Guard (acts as a reverse proxy in front of it)
    ↓
before_request: feature_extractor → model → router  → g.decision
    ↓
route handler checks g.decision
    ↓
"normal"   → proxy/forward to the real application backend
"honeypot" → return a decoy response, never touch the real backend
```

The pattern generalizes to any backend framework because the actual coupling is minimal: (1) point your frontend/clients at Ghost Guard's port instead of your app's port, (2) run your app on its own port and put that port in `CHATX_BACKEND_URL` (or an equivalently named var), (3) add a proxy handler per route you want protected, following `proxy/routes.py` as the template — it's ~70 lines of generic reverse-proxy code with one route-specific line (`/messages`).

**Flask / FastAPI / Django (Python)**: Reuse `proxy/routes.py` almost verbatim — swap the blueprint for a FastAPI `APIRouter` or a Django view; the core logic (build headers, forward with `requests`, strip hop-by-hop/CORS headers, check `g.decision` or its equivalent) doesn't change.

**Express.js / Node backends**: Port the same three functions conceptually — a header allow/deny list, an `http-proxy`/`fetch`-based forwarder, and a decision check before forwarding — Ghost Guard itself stays a separate Python/Flask process; only the thin proxy route needs to exist in whatever language fronts your app, or you point Ghost Guard directly at the app the same way it points at ChatX today (language-agnostic, since it proxies over plain HTTP).

**Next.js or any frontend-only app**: You don't need a Ghost Guard-side proxy at all — just point the frontend's API base URL env var at Ghost Guard, exactly like `ChatX/frontend/.env`'s `VITE_CHATX_API` does, and add one `proxy_bp`-style route in Ghost Guard per backend endpoint you want protected.

---

## 7. Generic Integration Adapter Concept

Ghost Guard is already, by construction, an independent service — ChatX has no import, client library, or SDK reference to it anywhere in its codebase (confirmed: no Ghost Guard imports exist in `ChatX/backend` or `ChatX/frontend`). The "adapter" is simply the proxy blueprint:

```text
Adapter Input:   raw incoming HTTP request (method, path, query, body, headers)
Adapter → internal: core/feature_extractor.py + ml/model.py + core/router.py (all in-process, no network call)
Ghost Guard internal decision: g.decision ("normal" | "honeypot"), g.anomaly_score
Adapter Output:  either a proxied upstream response (requests.request(...) to CHATX_BACKEND_URL)
                 or a fabricated decoy response (_honeypot_response())
```
There is no `check_request(...)`-style function exposed as a public API for other services to call remotely — the "adapter" *is* the proxy route itself, and the decision logic is invoked implicitly by Flask's `before_request` hook, not by an explicit function call from `proxy/routes.py`. If you want a truly reusable adapter interface, the natural refactor (not present in the code today) would be extracting `route_request(features)` behind a small importable `ghost_guard_client.check(request) -> decision` function — worth doing if you plan to protect many endpoints or reuse the decision logic outside of Flask's `g` object.

---

## 8. Files Required For Integration

```text
ChatX/
├── backend/
│   └── app.py            (port only — required)
├── frontend/
│   ├── src/pages/ChatPage.jsx   (env-driven URL — required)
│   └── .env               (VITE_CHATX_API — required)

Ghost-Guard-main/
├── backend/
│   ├── .env                    (CHATX_BACKEND_URL — required)
│   ├── app.py                  (register proxy_bp, load_dotenv ordering — required)
│   └── proxy/
│       ├── __init__.py         (required)
│       └── routes.py           (required — this is the integration code)
```

### Required
```text
File: ChatX/frontend/src/pages/ChatPage.jsx
Purpose: Chooses which backend URL the whole chat UI talks to.
Why it must change: Must point at Ghost Guard, not ChatX, for the proxy to be in the path at all.
What to add: Read the target URL from an env var instead of hardcoding it.

File: ChatX/frontend/.env
Purpose: Supplies that env var.
Why it must change: Doesn't exist by default; without it the frontend falls back to Ghost Guard's default (still fine, since the fallback in ChatPage.jsx already points at :5000).
What to add: VITE_CHATX_API=<ghost-guard-url>/messages

File: ChatX/backend/app.py
Purpose: Runs the real backend.
Why it must change: Must free the port Ghost Guard will occupy.
What to add: Change the app.run(port=...) value to whatever ChatX-facing port you choose (e.g. 8000), matching CHATX_BACKEND_URL below.

File: Ghost-Guard-main/backend/.env
Purpose: Tells Ghost Guard where the real backend lives.
Why it must change: Doesn't exist by default; without it, the hardcoded default http://127.0.0.1:8000 is used.
What to add: CHATX_BACKEND_URL=<your app backend URL>

File: Ghost-Guard-main/backend/proxy/routes.py
Purpose: Does the actual proxying/containment.
Why it must change: You need one route block per endpoint of your app you want protected — /messages is ChatX-specific.
What to add: Duplicate the messages_gateway() pattern for each route/method combination your app exposes, forwarding to the equivalent path on CHATX_BACKEND_URL.

File: Ghost-Guard-main/backend/app.py
Purpose: Wires the blueprint in.
Why it must change: Only if you rename the blueprint or file; otherwise no change needed beyond what's already there.
What to add: Nothing, if you reuse proxy_bp as-is with new routes added inside it.
```

### Optional
```text
File: Ghost-Guard-main/backend/core/router.py
Purpose: Decides normal vs honeypot.
Why: Only touch this if you want app-specific decoy/known-safe endpoint lists instead of ChatX's (/admin*, /login, /messages, /api/products, /api/profile).
What to add: Update DECOY_ENDPOINTS and KNOWN_SAFE_ENDPOINTS to match your app's real and decoy routes.

File: Ghost-Guard-main/backend/honeypot/fake_data.py
Purpose: Decoy payload content.
Why: Only if you want decoy data that looks like your domain instead of the generic admin/user/DB shape already there.

File: Ghost-Guard-main/backend/ml/models/isolation_forest.joblib + ml/train_model.py
Purpose: The trained anomaly model.
Why: Only needed if your traffic pattern differs enough from ChatX's that you want to retrain rather than reuse the shipped model.
```

### Ghost Guard (do not normally modify these when integrating into a new app)
```text
backend/core/feature_extractor.py   — generic, request-agnostic
backend/core/middleware.py          — generic before/after_request wiring
backend/ml/model.py                 — generic scoring wrapper
backend/explainability/explain.py   — generic reason generation
backend/logging_db/*                — generic storage layer
backend/api/dashboard_routes.py     — generic dashboard API
frontend/*                          — the SOC dashboard itself, app-agnostic
```

---

## 9. Environment Variables

| Variable | Used By | Purpose | Example |
|---|---|---|---|
| `CHATX_BACKEND_URL` | Ghost Guard backend (`proxy/routes.py`) | Upstream URL the proxy forwards legitimate traffic to | `http://127.0.0.1:8000` |
| `VITE_CHATX_API` | ChatX frontend (`ChatPage.jsx`) | Full URL (including `/messages`) the chat UI talks to — points at Ghost Guard, not ChatX | `http://127.0.0.1:5000/messages` |
| `VITE_BACKEND_URL` | Ghost Guard dashboard frontend (`frontend/src/api/ghostGuard.js`) | Base URL for the SOC dashboard's own API calls | `http://127.0.0.1:5000` |

No secrets (API keys, tokens) appear in any `.env` file in this codebase — both `.env` files found only contain plain service URLs.

---

## 10. Failure Handling

| Condition | Behavior | Where |
|---|---|---|
| Ghost Guard offline | Frontend simply can't reach it — no fallback to ChatX directly | Frontend `.env`/`ChatPage.jsx` has no secondary URL |
| ChatX (upstream) offline/unreachable | Ghost Guard catches `requests.RequestException`, returns `502` with `{"error": "ChatX backend unreachable", "detail": ...}` | `proxy/routes.py`, `messages_gateway()` |
| ChatX slow / times out | `requests.request(..., timeout=10)` raises a `Timeout` (subclass of `RequestException`), same `502` path | `proxy/routes.py` |
| ChatX returns HTTP 500 | Relayed as-is — Ghost Guard doesn't intercept or reinterpret upstream error codes, it passes status/body straight through | `_forward_to_chatx()` |
| ChatX returns invalid JSON | Not an issue — Ghost Guard doesn't parse the upstream body at all; it relays raw bytes (`upstream.content`) | `_forward_to_chatx()` |

**Fail-open or fail-closed?** For the security check itself: **fail-closed by default for `/messages`**, in the sense that if Ghost Guard's own process is down, the frontend has no configured path to reach ChatX directly at all (its only known URL is Ghost Guard's). But note this isn't a deliberate "deny on detector failure" design — it's a side effect of ChatX and Ghost Guard sharing no other configured URL. There's no code path where Ghost Guard is up but its own scoring model throws an exception; if `ml/model.py`'s `load_model()`/`decision_function()` ever raised, that exception isn't caught anywhere in `middleware.py`, and Flask would return a generic 500 for *every* request — effectively fail-closed for the whole app, but as an unhandled-exception default rather than an intentional policy.

**SECURITY IMPROVEMENT RECOMMENDED**: There is no explicit `try/except` around the scoring pipeline in `core/middleware.py`. If the Isolation Forest model file is missing, corrupted, or scikit-learn's API changes, every request to Ghost Guard (including legitimate `/messages` traffic) will 500 with no honeypot containment and no logged event, rather than degrading gracefully (e.g., falling back to "normal" and just flagging with a warning, or vice versa deliberately fail-closed with a clear operator-facing error). Decide and implement this intentionally rather than relying on the current unhandled-exception behavior.

---

## 11. Security Boundaries

| Responsibility | ChatX | Ghost Guard |
|---|:---:|:---:|
| Authentication | — | — |
| End-to-end message encryption | ✓ | |
| Message storage (SQLite) | ✓ | |
| Message routing/frontend UX | ✓ | |
| Request inspection | | ✓ |
| Risk scoring (Isolation Forest) | | ✓ |
| Honeypot / decoy responses | | ✓ |
| Attack/request logging | | ✓ |
| SOC dashboard | | ✓ |
| Reverse proxy to the real backend | | ✓ |

Note: neither project implements authentication in the traditional sense — ChatX relies on client-side encryption keys derived from a shared passphrase, not server-verified identity, and Ghost Guard doesn't gate on identity either, only on request shape/rate/endpoint.

---

## 12. Generic Integration Procedure

```text
Step 1 — Run your application backend on its own port (e.g. 8000),
         exactly as before — no code changes required in the app itself.

Step 2 — Run Ghost Guard's backend (backend/app.py) on port 5000.

Step 3 — Set CHATX_BACKEND_URL (Ghost-Guard-main/backend/.env) to your
         app backend's URL.

Step 4 — In proxy/routes.py, add one route block per endpoint you want
         protected, mirroring messages_gateway(): check g.decision,
         forward on "normal", return a decoy on "honeypot".

Step 5 — Point your frontend's API base URL at Ghost Guard's URL
         instead of your app backend's URL (mirrors ChatX/frontend/.env).

Step 6 — Add real decoy routes for your app's sensitive-looking paths
         in honeypot/routes.py + honeypot/fake_data.py (e.g. your own
         /admin, /login equivalents), and register them in
         core/router.py's DECOY_ENDPOINTS.

Step 7 — Update core/router.py's KNOWN_SAFE_ENDPOINTS to match your
         app's real, legitimate routes so the model's learned boundary
         (not an arbitrary score cutoff) governs their honeypot risk.

Step 8 — Test normal traffic through Ghost Guard's proxied routes and
         confirm it reaches your real backend and responses match.

Step 9 — Hit the decoy routes and any unknown/undeclared paths, confirm
         you get decoy JSON, HTTP 200, and never touch your real backend.

Step 10 — Check /status, /events, /honeypot-log on Ghost Guard and the
          dashboard UI to confirm events and sessions are recorded.
```

---

## 13. Minimal Integration Example (same architecture as ChatX)

```python
# your_backend/proxy/routes.py — same pattern as Ghost Guard's proxy/routes.py
import os, requests
from flask import Blueprint, request, Response, g, jsonify

proxy_bp = Blueprint("proxy", __name__)
UPSTREAM_URL = os.environ.get("APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")

@proxy_bp.route("/your-endpoint", methods=["GET", "POST"])
def gateway():
    if getattr(g, "decision", "normal") == "honeypot":
        return jsonify({"status": "ok"}), 200   # plausible decoy, not an error
    upstream = requests.request(
        method=request.method,
        url=f"{UPSTREAM_URL}/your-endpoint",
        params=request.args,
        data=request.get_data(cache=True),
        timeout=10,
    )
    return Response(upstream.content, status=upstream.status_code)
```
`g.decision` here is populated the same way it is for ChatX — by Ghost Guard's existing `core/middleware.py` `before_request` hook, unchanged.

---

## 14. Testing Checklist

**Normal user**
```text
[ ] Sending a message (POST /messages) via the app frontend succeeds and is stored in ChatX's DB
[ ] Fetching a conversation (GET /messages?conversationId=...) returns real stored messages
[ ] Deleting a conversation (DELETE /messages?conversationId=...) works and is reflected in ChatX's DB
[ ] Normal traffic is not misrouted to the honeypot (watch /status's honeypot_requests counter)
```

**Suspicious/decoy traffic**
```text
[ ] GET /admin, /admin/users, /admin/database, POST /login all return decoy data, never touch ChatX
[ ] An unrecognized path (e.g. /wp-admin) is scored and, above the router's threshold, routed to honeypot
[ ] /events shows an entry with decision="honeypot" and non-empty reasons
```

**Honeypot specifics**
```text
[ ] Honeypot /messages responses are plausible (correct shape per HTTP method), not obvious errors
[ ] Different conversationId values on GET/DELETE/POST /messages all behave identically when contained
[ ] /honeypot-log groups repeated requests from one source_ip into a single session with an action list
```

**Failure conditions**
```text
[ ] Stop the ChatX backend (port 8000) — GET/POST /messages via Ghost Guard should return 502 with the
    "ChatX backend unreachable" error, not crash Ghost Guard
[ ] Confirm Ghost Guard keeps serving /admin, /login, /status, /events even while ChatX is down
    (these don't depend on the upstream)
[ ] Rename/remove ml/models/isolation_forest.joblib and confirm what actually happens — per §10, expect an
    unhandled 500 rather than graceful degradation, and treat that as a gap to fix
```

---

## 15. Troubleshooting

- **All my legitimate traffic is going to the honeypot**: Check `core/router.py` — is your endpoint in `KNOWN_SAFE_ENDPOINTS`? If not, it's treated as "unknown" and penalized by `+10`, which can push it over the `60` threshold under moderate load. Add your real endpoints to that set.
- **Frontend gets CORS errors it didn't get before**: Ghost Guard's CORS config in `app.py` only allows `LOCAL_DEV_ORIGINS` (`localhost:5173`/`5174` and the `127.0.0.1` equivalents) by default — add your frontend's origin there.
- **502 "ChatX backend unreachable" even though the backend is running**: Confirm `CHATX_BACKEND_URL` in `Ghost-Guard-main/backend/.env` matches the port your app actually listens on, and that `load_dotenv()` really runs before `proxy.routes` is imported in `app.py` (module-level env read).
- **Dashboard shows nothing**: Confirm `VITE_BACKEND_URL` in `Ghost-Guard-main/frontend/.env` points at Ghost Guard's actual port, and that requests are actually hitting Ghost Guard (not going straight to your app).

---

## 16. Security Recommendations

1. **Wrap the scoring pipeline in `core/middleware.py` in a try/except** and define an explicit fail-open/fail-closed policy for the case where feature extraction or model inference throws (see §10) — right now this is undefined behavior.
2. **Make `DECOY_ENDPOINTS`, `KNOWN_SAFE_ENDPOINTS`, and the score thresholds in `core/router.py` environment/config-driven** rather than hardcoded, since every new integration currently requires editing this file directly.
3. **Consider signing/authenticating the Ghost Guard → upstream hop** (e.g., a shared secret header added in `_request_headers()` and checked by the upstream app) so the upstream can be configured to reject direct traffic that bypasses Ghost Guard — right now ChatX's backend on port 8000 is still directly reachable by anyone who finds it, with no enforcement that all traffic goes through the proxy.
4. **Add rate-limit/backpressure handling for the in-memory `recent_requests` dict in `feature_extractor.py`** — it grows unboundedly per unique source IP for the life of the process, with no eviction beyond the 10-second window filter on access; under a distributed/spoofed-IP flood this is a memory-growth vector.