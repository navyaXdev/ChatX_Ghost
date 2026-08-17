from flask import Blueprint, jsonify

real_api_bp = Blueprint("real_api", __name__)

FAKE_PRODUCTS = [
    {"id": 1, "name": "Wireless Mouse", "price": 25.99},
    {"id": 2, "name": "Mechanical Keyboard", "price": 89.99}
]

@real_api_bp.route("/api/products")
def products():
    return jsonify({"products": FAKE_PRODUCTS})

@real_api_bp.route("/api/profile")
def profile():
    return jsonify({"user": "demo_user", "status": "active"})