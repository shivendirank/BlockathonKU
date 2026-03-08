import serial
import time

COM_PORT = "COM6"
BAUD_RATE = 115200

print(f"Testing serial connection on {COM_PORT}...")
print("This will show RAW data from Arduino\n")

try:
    ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=1)
    print(f"✅ Port opened: {ser.name}")
    print(f"Baud: {ser.baudrate}, Open: {ser.is_open}\n")
    print("Waiting for data (Ctrl+C to stop)...\n")
    
    count = 0
    while True:
        if ser.in_waiting > 0:
            raw_bytes = ser.read(ser.in_waiting)
            try:
                decoded = raw_bytes.decode('utf-8', errors='replace')
                print(f"[{count}] RAW: {repr(raw_bytes)}")
                print(f"[{count}] DECODED: {decoded}")
                count += 1
            except Exception as e:
                print(f"Decode error: {e}")
        else:
            print(".", end="", flush=True)
            time.sleep(0.5)
            
except serial.SerialException as e:
    print(f"❌ Serial Error: {e}")
    print("\nPossible issues:")
    print("1. Another program is using COM6 (close Arduino IDE Serial Monitor)")
    print("2. Arduino is not connected")
    print("3. Wrong COM port")
except Exception as e:
    print(f"❌ Error: {e}")
