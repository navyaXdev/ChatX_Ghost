"""Local Ghost Guard integration smoke checks.
Run while ChatX is on :8000 and Ghost Guard is on :5000.
"""
import requests

GG = "http://127.0.0.1:5000"

print("Ghost Guard health:", requests.get(f"{GG}/health", timeout=5).status_code)
print("ChatX polling:", requests.get(
    f"{GG}/messages", params={"conversationId": "integration-test", "since": 0}, timeout=5
).status_code)

payload = {
    "conversationId": "integration-test",
    "senderName": "integration-test",
    "ciphertext": "test-ciphertext",
    "iv": "test-iv",
}
response = requests.post(f"{GG}/messages", json=payload, timeout=5)
print("ChatX POST through Ghost Guard:", response.status_code, response.text)

status = requests.get(f"{GG}/status", timeout=5).json()
print("Dashboard status:", status)
