import requests

FRONTEND_URL = "http://localhost:3000"

print("🚨 Manually triggering crash event...")

try:
    response = requests.post(
        f"{FRONTEND_URL}/api/arduino/trigger", 
        json={"gForce": 4.5}, 
        timeout=2
    )
    
    if response.status_code == 200:
        print("✅ Crash successfully triggered!")
        print(f"Response: {response.json()}")
    else:
        print(f"❌ Failed: {response.status_code}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    print("Make sure Next.js is running on localhost:3000")
