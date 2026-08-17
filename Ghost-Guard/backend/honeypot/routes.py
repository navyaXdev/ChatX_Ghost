from flask import Blueprint, jsonify
from honeypot.fake_data import FAKE_USERS, FAKE_DB_INFO, FAKE_LOGIN_SUCCESS

honeypot_bp = Blueprint("honeypot", __name__)

@honeypot_bp.route("/admin")
def fake_admin():
    return jsonify({"message": "Welcome to admin panel", "sections": ["users", "database", "logs"]})

@honeypot_bp.route("/admin/users")
def fake_admin_users():
    return jsonify({"users": FAKE_USERS})

@honeypot_bp.route("/admin/database")
def fake_admin_database():
    return jsonify(FAKE_DB_INFO)

@honeypot_bp.route("/login", methods=["POST"])
def fake_login():
    return jsonify(FAKE_LOGIN_SUCCESS)