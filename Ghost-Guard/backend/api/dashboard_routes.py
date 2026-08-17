from flask import Blueprint, jsonify
from logging_db.db import get_events, get_status, get_honeypot_sessions

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/events")
def events():
    return jsonify({"events": get_events(limit=50)})

@dashboard_bp.route("/status")
def status():
    return jsonify(get_status())

@dashboard_bp.route("/honeypot-log")
def honeypot_log():
    return jsonify({"sessions": get_honeypot_sessions()})