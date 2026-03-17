"""
Quick Arduino Test Script
Tests if Arduino Nano 33 BLE Sense is sending data on COM6
"""

import serial
import time

COM_PORT = "COM6"
BAUD_RATE = 115200

print("Arduino Quick Test")
print("=" * 60)

try:
    ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=1)
    print(f"✅ Connected to {COM_PORT} at {BAUD_RATE} baud")
    print("=" * 60)
    print("\nListening for 10 seconds...")
    print("(Shake the Arduino to see G-force change)\n")
    
    start_time = time.time()
    line_count = 0
    data_count = 0
    
    while time.time() - start_time < 15:
        if ser.in_waiting > 0:
            try:
                line = ser.readline().decode('utf-8').strip()
                if line:
                    line_count += 1
                    
                    # Count DATA lines (sensor readings)
                    if line.startswith("DATA:"):
                        data_count += 1
                        # Only print every 5th DATA line to reduce clutter
                        if data_count % 5 == 0:
                            print(f"[{line_count:3d}] {line}")
                    else:
                        print(f"[{line_count:3d}] {line}")
                    
                    if "EVENT:CRASH" in line:
                        print("\n🚨 CRASH EVENT DETECTED! ✅\n")
                    
            except Exception as e:
                print(f"Error reading: {e}")
        
        time.sleep(0.01)
    
    ser.close()
    
    print("\n" + "=" * 60)
    if line_count > 0:
        print(f"✅ SUCCESS: Received {line_count} total lines ({data_count} DATA lines)")
        if data_count > 0:
            print("✅ Arduino is reading sensors correctly!")
            print("\n📋 What to do next:")
            print("   1. Run: python bridge.py")
            print("   2. Open: https://aeroguard-ui.vercel.app/arduino-debug")
            print("   3. Shake Arduino to trigger crash (>1.5G)")
        else:
            print("⚠️  Arduino booted but no sensor data yet")
            print("   This is normal - data comes after boot sequence")
    else:
        print("❌ FAILED: No data received")
        print("\nTroubleshooting:")
        print("1. Make sure Arduino code is uploaded")
        print("2. Open Arduino IDE Serial Monitor to verify data")
        print("3. Close Serial Monitor before running this script")
    print("=" * 60)
    
except serial.SerialException as e:
    print(f"❌ ERROR: Could not connect to {COM_PORT}")
    print(f"   {e}")
    print("\nTroubleshooting:")
    print("1. Check if Arduino is plugged in")
    print("2. Close Arduino IDE Serial Monitor if open")
    print("3. Run: Get-PnpDevice -Class Ports")
    print("   to verify COM port number")
    
except Exception as e:
    print(f"❌ Unexpected error: {e}")
