# ChatX 🔐

ChatX is a client-side end-to-end encrypted chat application built for NYC CodeQuest 2026 (CYBER-02: "The Attacker Has the Source Code"). Messages are encrypted **inside the user's browser** before being sent to the server, and the backend only ever stores and forwards ciphertext — it never sees plaintext, passphrases, or encryption keys.

---

## 🚀 Features

- 🔒 End-to-end encryption
- 🔑 PBKDF2-based key derivation
- 🛡 AES-256-GCM message encryption
- 🔄 Real-time chat using polling
- 🏠 Shared conversation rooms
- 💾 Session persistence
- ⚡ React-based UI
- 🚫 Server cannot read user messages

---

## Architecture

The backend is intentionally "dumb" — it stores and forwards encrypted message blobs and never has access to plaintext, passphrases, or encryption keys. All encryption and decryption happens client-side in the browser using the Web Crypto API. Even with full access to the source code and the live database, message content cannot be recovered without the shared passphrase, which never leaves the client.

```
Browser (User A)                Browser (User B)
Passphrase → PBKDF2 → AES-256-GCM Key → Encrypt/Decrypt
        │                                      │
        └──────────────┬───────────────────────┘
                        ▼
                  Flask Backend
          (stores ciphertext only, cannot decrypt)
                        │
                        ▼
                    SQLite DB
              (only encrypted blobs)
```

**Frontend responsibilities:**
- User authentication/session handling
- Client-side encryption key generation
- Encrypting outgoing messages
- Decrypting incoming messages
- Chat interface
- Polling encrypted messages from the backend

**Backend responsibilities:**
- Storing and serving encrypted message blobs
- Room-based message routing (`conversationId`)
- Nothing else — no crypto, no plaintext, ever

---

## 🛠 Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- React Router DOM
- Web Crypto API

### Backend
- **Framework:** Flask
- **Database:** SQLite
- **WSGI Server:** Gunicorn (production)
- **CORS:** flask-cors (for cross-origin requests from the Vercel-hosted frontend)
- **Deployment:** Render (free tier)

### Cryptography
- PBKDF2
- SHA-256
- AES-GCM 256-bit encryption

---

## Data Model

**`messages` table**

| Column | Type | Description |
|---|---|---|
| `messageId` | INTEGER PK AUTOINCREMENT | Server-assigned, used for ordering and incremental polling |
| `conversationId` | TEXT NOT NULL | Room identifier |
| `senderName` | TEXT NOT NULL | Display name (no authentication in this MVP) |
| `ciphertext` | TEXT NOT NULL | Base64-encoded encrypted message (includes AES-GCM auth tag) |
| `iv` | TEXT NOT NULL | Base64-encoded initialization vector, unique per message |
| `timestamp` | INTEGER NOT NULL | Server-assigned Unix timestamp |

---

## API Reference

### `POST /messages`
Send an encrypted message.

**Request body:**
```json
{
  "conversationId": "room1",
  "senderName": "mohit",
  "ciphertext": "<base64>",
  "iv": "<base64>"
}
```

**Responses:**
- `201` — `{ "status": "sent" }`
- `400` — `{ "error": "Missing required field" }` or `{ "error": "Invalid JSON body" }`

### `GET /messages?conversationId=<id>&since=<messageId>`
Poll for messages in a room, newer than `since` (defaults to `0` for full history).

**Response:**
- `200` —
```json
[
  {
    "messageId": 1,
    "senderName": "mohit",
    "ciphertext": "<base64>",
    "iv": "<base64>",
    "timestamp": 1784622581
  }
]
```
- `400` — `{ "error": "conversationId is required" }`

### `DELETE /messages?conversationId=<id>`
Delete all messages in a room.

**Response:**
- `200` — `{ "status": "deleted" }`
- `400` — `{ "error": "conversationId is required" }`

### `GET /health`
Liveness check.

**Response:**
- `200` — `{ "status": "ok" }`

---

## 🛡 Security Model

✅ Messages are encrypted before leaving the browser
✅ Encryption keys stay on the client
✅ Backend only stores ciphertext
✅ Server administrators cannot read messages
✅ Source code exposure does not reveal messages

**Security properties, in detail:**
- Server never receives or stores plaintext, passphrases, or encryption keys
- Database compromise does not expose message content (ciphertext only)
- Source code disclosure does not compromise confidentiality (no decryption logic exists server-side)
- All database queries use parameterized statements (no SQL injection surface)

---

## Known Limitations (Scoped MVP Tradeoffs)

- **No sender authentication** — `senderName` is a self-reported label; anyone with a room's passphrase can post under any name. Message *confidentiality* is cryptographically guaranteed; sender *attribution* is not.
- **No session management** — room access is gated entirely by knowledge of `conversationId` and passphrase.
- **Polling, not WebSockets** — frontend polls every ~2.5s rather than using push-based delivery, prioritizing build reliability over real-time latency.
- **SQLite on Render free tier** — filesystem storage may not persist across service restarts/redeploys. Acceptable for demo purposes.

---

## ⚙️ Local Setup

### Backend

```bash
cd backend
pip install -r requirements.txt --break-system-packages
python db.py        # initializes chatx.db
python app.py        # runs locally on http://127.0.0.1:5000
```

### Frontend

```bash
git clone <frontend-repository-url>
cd frontend
npm install
npm run dev
```

Frontend runs on:
```
http://localhost:5173
```

---

## Deployment

**Backend (Render)**
- **Root directory:** `backend`
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `gunicorn app:app`
- **Live URL:** `<add your Render URL here>`

**Frontend (Vercel)**
- Configured via an `API_BASE` constant pointing at the Render URL above.

---

## 🧪 Testing

Every backend endpoint has been manually verified for both success and failure paths (missing fields, malformed JSON, empty-room queries, incremental polling correctness) against a live running instance — not just confirmed to start without errors.

**Manual end-to-end test:**

Open two browsers.

**User 1**
```
Username: Mohit
Conversation ID: room1
Passphrase: secure123
```

**User 2**
```
Username: Dinesh
Conversation ID: room1
Passphrase: secure123
```

Both users should be able to communicate.