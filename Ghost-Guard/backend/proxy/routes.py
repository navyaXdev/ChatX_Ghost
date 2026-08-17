import os
import requests
from flask import Blueprint, request, Response, g, jsonify

proxy_bp = Blueprint("proxy", __name__)

CHATX_BACKEND_URL = os.environ.get(
    "CHATX_BACKEND_URL", "http://127.0.0.1:8000"
).rstrip("/")

# Headers that describe the current HTTP hop or the proxy itself.  requests
# creates Host/Content-Length and transparently decodes compressed responses,
# so those headers must not be copied through unchanged.
HOP_BY_HOP_HEADERS = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-length", "host",
    "server", "date", "accept-encoding",
}

# ChatX is the upstream service; Ghost Guard is the public/local browser-facing
# service.  Let Ghost Guard's Flask-CORS middleware generate these headers once.
UPSTREAM_CORS_HEADERS = {
    "access-control-allow-origin",
    "access-control-allow-credentials",
    "access-control-allow-methods",
    "access-control-allow-headers",
    "access-control-expose-headers",
    "access-control-max-age",
}

RESPONSE_HEADERS_TO_STRIP = HOP_BY_HOP_HEADERS | UPSTREAM_CORS_HEADERS | {
    "content-encoding",
}


def _request_headers():
    """Copy end-to-end request headers without forwarding hop/CORS headers."""
    blocked = HOP_BY_HOP_HEADERS | {
        "origin",
        "access-control-request-method",
        "access-control-request-headers",
    }
    return {k: v for k, v in request.headers.items() if k.lower() not in blocked}


def _response_headers(headers_items):
    """Return safe upstream headers for the browser-facing Flask response."""
    return {
        k: v
        for k, v in headers_items
        if k.lower() not in RESPONSE_HEADERS_TO_STRIP
    }


def _forward_to_chatx(chatx_path):
    """Forward the request to ChatX and preserve its status/body semantics."""
    target_url = f"{CHATX_BACKEND_URL}/{chatx_path.lstrip('/')}"

    upstream = requests.request(
        method=request.method,
        url=target_url,
        params=request.args,
        data=request.get_data(cache=True),
        headers=_request_headers(),
        timeout=10,
        allow_redirects=False,
    )

    # requests has already decoded gzip/br/deflate responses.  Do not relay
    # Content-Encoding/Content-Length from upstream or the browser may try to
    # decode the body a second time.
    return Response(
        upstream.content,
        status=upstream.status_code,
        headers=_response_headers(upstream.headers.items()),
    )


def _honeypot_response():
    """Controlled response for requests that Ghost Guard contains."""
    if request.method == "GET":
        return jsonify([]), 200
    if request.method == "DELETE":
        return jsonify({"status": "deleted"}), 200
    return jsonify({"status": "sent"}), 201


@proxy_bp.route("/messages", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def messages_gateway():
    decision = getattr(g, "decision", "normal")

    if decision == "honeypot":
        return _honeypot_response()

    try:
        return _forward_to_chatx("messages")
    except requests.RequestException as exc:
        return jsonify({
            "error": "ChatX backend unreachable",
            "detail": str(exc),
        }), 502
