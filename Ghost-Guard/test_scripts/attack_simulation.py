import requests
import time

BASE_URL = "http://127.0.0.1:5000"

def endpoint_scraping():
    print("Simulating endpoint scraping...")
    targets = ["/admin", "/admin/users", "/admin/database", "/login"]
    for endpoint in targets:
        method = "POST" if endpoint == "/login" else "GET"
        response = requests.request(method, BASE_URL + endpoint)
        print(f"{method} {endpoint} -> {response.status_code}")
        time.sleep(0.3)

def rapid_fire_attack(endpoint="/admin/users", count=20):
    print(f"Simulating rapid-fire attack on {endpoint}...")
    for i in range(count):
        response = requests.get(BASE_URL + endpoint)
        print(f"[{i+1}/{count}] GET {endpoint} -> {response.status_code}")
        time.sleep(0.1)

if __name__ == "__main__":
    endpoint_scraping()
    rapid_fire_attack()