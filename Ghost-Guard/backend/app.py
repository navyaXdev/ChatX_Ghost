from dotenv import load_dotenv
load_dotenv()  # must run before importing proxy.routes, which reads CHATX_BACKEND_URL at import time

from flask import Flask
from flask_cors import CORS
from logging_db.db import init_db
from core.middleware import register_middleware
from real_api.routes import real_api_bp
from honeypot.routes import honeypot_bp
from api.dashboard_routes import dashboard_bp
from proxy.routes import proxy_bp

app = Flask(__name__)

LOCAL_DEV_ORIGINS = [
    "http://localhost:5173", "http://127.0.0.1:5173",  # ChatX frontend
    "http://localhost:5174", "http://127.0.0.1:5174",  # Ghost Guard dashboard
]
CORS(app, origins=LOCAL_DEV_ORIGINS, supports_credentials=True)

init_db()
register_middleware(app)

app.register_blueprint(real_api_bp)
app.register_blueprint(honeypot_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(proxy_bp)

@app.route("/health")
def health():
    return {"status": "alive"}, 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)