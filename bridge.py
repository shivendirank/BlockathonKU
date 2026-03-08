import serial
import requests
import time

# 🛠️ CONFIG
BASE_URL = "http://45.76.31.34:8000"
COM_PORT = "COM6"
FRONTEND_URL = "http://localhost:3000"

has_crashed = False
last_sync_time = 0
sync_interval = 2.0 

# Store latest sensor readings
last_sensor_data = {
    "temp": "28.4",
    "hum": "45.2",
    "gforce": "1.0"
}

try:
    ser = serial.Serial(COM_PORT, 115200, timeout=1)
    print(f"📡 Bridge Active on {COM_PORT}. Listening for Arduino...")
except Exception as e:
    print(f"❌ Connection Error: {e}")
    print(f"   Make sure Arduino is plugged in and Serial Monitor is closed!")
    print(f"   Check Device Manager for correct COM port.")
    exit()

print("="*60)
print("🛡️  FlightChain Bridge - Arduino to Cloud Gateway")
print("="*60)
print(f"Arduino Port: {COM_PORT}")
print(f"Vultr MCP:    {BASE_URL}")
print(f"Frontend:     {FRONTEND_URL}")
print(f"Crash Threshold: >2.2G")
print("="*60)
print("\n⏳ Waiting for Arduino sensor data...\n")

while True:
    if ser.in_waiting > 0:
        try:
            line = ser.readline().decode('utf-8').strip()
            if not line: continue
            
            # 🔍 DEBUG: Show everything coming from Arduino
            print(f"[{time.strftime('%H:%M:%S')}] {line}")

            # ── CRASH EVENT DETECTED ────────────────────────────────────────────
            if "EVENT:CRASH" in line and not has_crashed:
                print("\n" + "="*60)
                print("🚨 CRASH DETECTED! Initiating emergency cascade...")
                print("="*60)
                
                # Build comprehensive telemetry payload using latest sensor data
                crash_telemetry = {
                    "temp": last_sensor_data["temp"],
                    "hum": last_sensor_data["hum"],
                    "g": last_sensor_data["gforce"],
                    "pressure": "85.3",  # Mock pressure sensor (kPa)
                    "altitude": "40068",  # Mock altitude (feet)
                    "latitude": "40.8204",  # Mock GPS coordinates
                    "longitude": "-0.0448",
                    "ipfs_cid": f"QmCrash{int(time.time())}",  # Simulated IPFS CID
                    "xrpl_tx": f"TX{hex(int(time.time()))[2:].upper()}",  # Simulated XRPL hash
                    "flight_callsign": "QR4714",
                    "status": "CRASH"
                }
                
                print(f"\n📊 Crash Telemetry:")
                print(f"   G-Force: {crash_telemetry['g']}G")
                print(f"   Temp: {crash_telemetry['temp']}°C")
                print(f"   Humidity: {crash_telemetry['hum']}%")
                print(f"   Position: {crash_telemetry['latitude']}N, {crash_telemetry['longitude']}E")
                print(f"   Altitude: {crash_telemetry['altitude']}ft")
                
                # Update telemetry with crash data
                try:
                    requests.post(f"{BASE_URL}/update_telemetry", json=crash_telemetry, timeout=5)
                    print(f"\n✅ [1/3] Vultr MCP telemetry updated")
                except Exception as e:
                    print(f"\n⚠️  [1/3] Vultr telemetry error: {e}")
                
                # Notify Vultr MCP server of crash status
                try:
                    requests.post(f"{BASE_URL}/trigger_event", json={"status": "CRASH"}, timeout=5)
                    print(f"✅ [2/3] Vultr crash event triggered")
                except Exception as e:
                    print(f"⚠️  [2/3] Vultr event error: {e}")
                
                # Notify Next.js frontend
                try:
                    requests.post(f"{FRONTEND_URL}/api/arduino/trigger", json={"gForce": float(crash_telemetry['g'])}, timeout=2)
                    print(f"✅ [3/3] Frontend emergency cascade initiated")
                except Exception as e:
                    print(f"⚠️  [3/3] Frontend error: {e}")
                
                print("\n" + "="*60)
                print("✅ Emergency protocols activated!")
                print("   → Dashboard: Emergency mode")
                print("   → XRPL: NFT URI update pending")
                print("   → Escrow: Rescue funds release pending")
                print("   → Voice AI: Ready for status query")
                print("="*60 + "\n")
                
                has_crashed = True
            
            # ── SENSOR DATA UPDATE ──────────────────────────────────────────────
            elif line.startswith("DATA:"):
                parts = line.split(":")
                # Format: DATA[0], T[1], 28.4[2], H[3], 45.2[4], G[5], 1.0[6]
                if len(parts) >= 7:
                    last_sensor_data["temp"] = parts[2]
                    last_sensor_data["hum"] = parts[4]
                    last_sensor_data["gforce"] = parts[6]
                    
                    # Sync with Vultr at regular intervals
                    if not has_crashed:
                        now = time.time()
                        if now - last_sync_time > sync_interval:
                            payload = {"temp": parts[2], "hum": parts[4], "g": parts[6]}
                            try:
                                requests.post(f"{BASE_URL}/update_telemetry", json=payload, timeout=2)
                                print(f"   💚 Sync → Temp: {parts[2]}°C, Humidity: {parts[4]}%, G-force: {parts[6]}G")
                                last_sync_time = now
                            except:
                                pass  # Silent fail for routine updates
            
            # ── OTHER EVENTS ────────────────────────────────────────────────────
            elif "EVENT:TURBULENCE" in line and not has_crashed:
                try:
                    requests.post(f"{BASE_URL}/trigger_event", json={"status": "TURBULENCE"}, timeout=2)
                    print("⚠️  Turbulence detected")
                except:
                    pass
            
            elif "SYSTEM:" in line:
                # Arduino system messages (BOOT, READY, etc.)
                print(f"   🔧 {line}")
                    
        except Exception as e:
            print(f"⚠️ Parsing Error: {e}")
            
    time.sleep(0.01)