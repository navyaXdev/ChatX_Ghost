import requests
import time
import random

BASE_URL = "http://127.0.0.1:5000"
ENDPOINTS = ["/api/products", "/api/profile"]

def simulate_normal_traffic(duration_seconds=30):
    print(f"Simulating normal traffic for {duration_seconds}s...")
    start = time.time()

    while time.time() - start < duration_seconds:
        endpoint = random.choice(ENDPOINTS)
        response = requests.get(BASE_URL + endpoint)
        print(f"GET {endpoint} -> {response.status_code}")
        time.sleep(random.uniform(0.5, 2.0))

if __name__ == "__main__":
    simulate_normal_traffic()