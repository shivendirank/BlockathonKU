# Arduino Setup Guide for AeroGuard Crash Detection

## Hardware Requirements
- **Arduino Nano 33 BLE Sense**
- **USB Cable** (USB-A to Micro-USB)
- **Computer** with Arduino IDE

## Software Installation

### 1. Install Arduino IDE
Download from: https://www.arduino.cc/en/software

### 2. Install Board Support
1. Open Arduino IDE
2. Go to **Tools → Board → Boards Manager**
3. Search for: `Arduino Mbed OS Nano Boards`
4. Install the latest version

### 3. Install Required Libraries
Go to **Sketch → Include Library → Manage Libraries**, then install:
- `Arduino_LSM9DS1` (IMU sensor library)
- `Arduino_HTS221` (Temperature & Humidity library)

## Upload Instructions

### 1. Connect Arduino
- Plug Arduino Nano 33 BLE Sense into USB port
- Wait for drivers to install (Windows will do this automatically)

### 2. Configure Arduino IDE
- **Board:** Arduino Nano 33 BLE
- **Port:** COM6 (or your detected port)
  - Go to **Tools → Port** and select the COM port

### 3. Open Sketch
- Open `AeroGuard_Arduino.ino` in Arduino IDE

### 4. Upload Code
1. Click **Upload** button (→ arrow icon)
2. Wait for compilation
3. Upload progress will show at bottom
4. Should show: `Done uploading.`

### 5. Verify Upload
Open **Tools → Serial Monitor** (Ctrl+Shift+M):
- **Baud rate:** 115200
- You should see:
  ```
  SYSTEM:BOOT
  SYSTEM:IMU_OK
  SYSTEM:HTS_OK
  SYSTEM:READY
  CONFIG:THRESHOLD:2.2G
  DATA:T:24.5:H:55.2:G:1.02
  ```

## Testing Crash Detection

### Method 1: Shake Test
1. **Close Serial Monitor** (serial port can't be shared)
2. Run `python bridge.py` in terminal
3. **Shake the Arduino hard** (rapid back-and-forth motion)
4. Should see in bridge.py output:
   ```
   DEBUG: EVENT:CRASH
   DEBUG: CRASH:G_FORCE:2.75
   ✅ Vultr telemetry updated: G-force 2.75G
   ✅ Vultr crash event triggered!
   ✅ Frontend notified!
   ```

### Method 2: Drop Test (Gentle)
1. Hold Arduino ~10cm above soft surface (pillow/foam)
2. Drop it (IMU detects sudden acceleration change)
3. Crash should trigger

### Method 3: Tap Test
1. Firmly tap the Arduino on a hard surface
2. Multiple quick taps may exceed threshold

## Configuration

### Adjust Sensitivity
In `AeroGuard_Arduino.ino`, modify line 14:
```cpp
const float CRASH_THRESHOLD = 2.2;  // Lower = more sensitive
```

**Recommended values:**
- **2.2G:** Default (good balance)
- **1.8G:** More sensitive (detects lighter impacts)
- **2.8G:** Less sensitive (only hard impacts)

### Change Sensor Interval
Modify line 15:
```cpp
const int SENSOR_INTERVAL = 500;  // Milliseconds between readings
```

## Troubleshooting

### "Port COM6 not found"
- Check Device Manager → Ports (COM & LPT)
- Look for "Arduino Nano 33 BLE"
- Note the COM port number
- Update bridge.py: `COM_PORT = "COM7"` (or your port)

### "Crash not triggering when shaking"
- **Too gentle:** Shake harder with rapid back-and-forth motion
- **Threshold too high:** Lower `CRASH_THRESHOLD` to 1.8
- **Serial Monitor open:** Close it! It locks the COM port
- **bridge.py not running:** Start it first

### "IMU_INIT_FAILED"
- Board not properly connected
- Wrong board selected in Arduino IDE
- Try different USB port/cable

### "No data appearing in bridge.py"
1. Close Arduino IDE Serial Monitor
2. Restart bridge.py
3. Check COM_PORT matches Arduino IDE port
4. Run in terminal: `python -m serial.tools.list_ports` to see available ports

### "Import errors in Arduino IDE"
- Install missing libraries via Library Manager
- Restart Arduino IDE after installation

## LED Indicator
- **Quick blink:** Crash detected
- Arduino Nano 33 BLE Sense has built-in orange LED (pin 13)

## Serial Protocol

### Commands sent by Arduino:
- `SYSTEM:BOOT` - Device starting
- `SYSTEM:READY` - Ready for operation
- `DATA:T:24.5:H:55.2:G:1.02` - Sensor readings (every 500ms)
- `EVENT:CRASH` - Crash detected!
- `CRASH:G_FORCE:2.75` - Crash details

### Expected by bridge.py:
- `EVENT:CRASH` triggers emergency cascade
- `DATA:T:{temp}:H:{humidity}:G:{gforce}` updates telemetry

## pins (for future expansion)
- **D2-D13:** Digital I/O pins
- **A0-A7:** Analog input pins
- **I2C:** IMU and environmental sensors (built-in)
- **SPI:** Optional external sensors

## Next Steps
Once Arduino is working:
1. Keep Arduino plugged in via USB
2. Run `python bridge.py`
3. Shake Arduino to trigger crash
4. Dashboard should show emergency mode
5. XRPL NFT will update
6. Voice AI will report sensor data

**Ready to test!** 🚀
