import time

recent_requests = {}

def extract_features(request):
    source_ip = request.remote_addr or "unknown"
    method = request.method
    endpoint = request.path
    payload_size = request.content_length or 0

    now = time.time()
    window = 10

    if source_ip not in recent_requests:
        recent_requests[source_ip] = []

    recent_requests[source_ip] = [
        t for t in recent_requests[source_ip] if now - t < window
    ]
    recent_requests[source_ip].append(now)

    request_rate = len(recent_requests[source_ip]) / window
    request_rate = min(request_rate, 10)

    return {
        "source_ip": source_ip,
        "method": method,
        "endpoint": endpoint,
        "payload_size": payload_size,
        "request_rate": request_rate
    }