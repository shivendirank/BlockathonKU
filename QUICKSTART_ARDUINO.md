# 🚀 Quick Start: Arduino Shake Detection

## What You Have Now

✅ **Arduino Code:** [AeroGuard_Arduino.ino](AeroGuard_Arduino/AeroGuard_Arduino.ino)
✅ **Python Bridge:** [bridge.py](bridge.py) (updated with better logging)
✅ **XRPL NFT:** Minted with ID `001800002AD8A3678976F99FAA4DC616FEFA1A120BFB79A0FF85C8340002049A`
✅ **Dev Server:** Running on http://localhost:3000
✅ **Ngrok Tunnel:** https://unequilaterally-tendrillar-kyra.ngrok-free.app

## 🎯 Step-by-Step: Upload Arduino Code

### 1. Open Arduino IDE
- Download from https://www.arduino.cc/en/software if you don't have it

### 2. Install Board Support
- **Tools → Board → Boards Manager**
- Search: `Arduino Mbed OS Nano Boards`
- Click **Install**

### 3. Install Libraries
- **Sketch → Include Library → Manage Libraries**
- Install these two:
  - `Arduino_LSM9DS1`
  - `Arduino_HTS221`

### 4. Open the Sketch
- **File → Open**
- Navigate to: `C:\Users\HEET\Downloads\BlockathonKU\AeroGuard_Arduino\AeroGuard_Arduino.ino`

### 5. Select Board and Port
- **Tools → Board → Arduino Mbed OS Nano Boards → Arduino Nano 33 BLE**
- **Tools → Port → COM6** (or whichever COM port shows "Arduino Nano 33 BLE")

### 6. Upload
- Click the **Upload** button (→ arrow icon at top left)
- Wait ~30 seconds for compilation and upload
- Should say: **"Done uploading."**

### 7. Verify Upload (Optional)
- **Tools → Serial Monitor** (Ctrl+Shift+M)
- Set baud rate: **115200**
- You should see:
  ```
  SYSTEM:BOOT
  SYSTEM:IMU_OK
  SYSTEM:HTS_OK
  SYSTEM:READY
  CONFIG:THRESHOLD:2.2G
  DATA:T:24.5:H:55.2:G:1.02
  ```
- **IMPORTANT:** Close Serial Monitor before running bridge.py!

---

## 🧪 Test the Full System

### 1. Start Python Bridge
**Close Arduino IDE Serial Monitor first!** (Can't share COM port)

Open PowerShell:
```powershell
cd C:\Users\HEET\Downloads\BlockathonKU
python bridge.py
```

You should see:
```
============================================================
🛡️  AeroGuard Bridge - Arduino to Cloud Gateway
============================================================
Arduino Port: COM6
Vultr MCP:    http://45.76.31.34:8000
Frontend:     http://localhost:3000
Crash Threshold: >2.2G
============================================================

⏳ Waiting for Arduino sensor data...

[14:23:45] SYSTEM:BOOT
[14:23:45] SYSTEM:IMU_OK
[14:23:45] SYSTEM:HTS_OK
[14:23:45] SYSTEM:READY
[14:23:46] DATA:T:24.5:H:55.2:G:1.02
   💚 Sync → Temp: 24.5°C, Humidity: 55.2%, G-force: 1.02G
```

### 2. Shake the Arduino!
**Hold Arduino firmly and shake it rapidly back and forth (like shaking a can of spray paint)**

You should see:
```
[14:24:10] EVENT:CRASH
============================================================
🚨 CRASH DETECTED! Initiating emergency cascade...
============================================================

📊 Crash Telemetry:
   G-Force: 2.75G
   Temp: 24.5°C
   Humidity: 55.2%
   Position: 40.8204N, -0.0448E
   Altitude: 40068ft

✅ [1/3] Vultr MCP telemetry updated
✅ [2/3] Vultr crash event triggered
✅ [3/3] Frontend emergency cascade initiated

============================================================
✅ Emergency protocols activated!
   → Dashboard: Emergency mode
   → XRPL: NFT URI update pending
   → Escrow: Rescue funds release pending
   → Voice AI: Ready for status query
============================================================
```

### 3. Check Dashboard
Open browser: http://localhost:3000/dashboard

Should automatically transition to emergency mode with:
- 🚨 Red alert overlay
- Crash cascade animation
- XRPL transaction logs in console (F12)

### 4. Check XRPL Transactions
Open browser console (F12) → Console tab

Look for:
```
XRPL NFT Update:
  Transaction Hash: ABC123...
  Explorer: https://devnet.xrpl.org/transactions/ABC123...

XRPL Escrow Created:
  Transaction Hash: DEF456...
  Amount: 100,000 RLUSD
```

Visit the explorer links to see your transactions on Devnet!

---

## 🎤 Test Voice AI (After ElevenLabs Setup)

1. Open: http://localhost:3000/emergency
2. Click **🎤 microphone button** (should turn red)
3. Say: *"What's the aircraft status?"*
4. Agent should respond with:
   - Flight QR4714
   - G-force reading
   - Position, altitude, temperature, pressure, humidity
   - IPFS CID
   - XRPL transaction hash

---

## 🔧 Troubleshooting

### Arduino Won't Upload
- **Error: "Port not found"**
  - Check Device Manager → Ports (COM & LPT)
  - Note the COM port number
  - Update bridge.py: `COM_PORT = "COM7"`

- **Error: "Board not detected"**
  - Try different USB cable
  - Try different USB port
  - Restart Arduino IDE

### Bridge.py Won't Connect
- **"Connection Error"**
  - Close Arduino IDE Serial Monitor
  - Check COM port in Device Manager
  - Update `COM_PORT` in bridge.py if needed

### Crash Not Triggering
- **Shake not hard enough**
  - Rapid back-and-forth motion
  - Like shaking a spray paint can
  - Or firmly tap Arduino on desk

- **Threshold too high**
  - Edit `AeroGuard_Arduino.ino` line 14:
  - Change `2.2` to `1.8` for more sensitivity
  - Re-upload to Arduino

- **Serial Monitor open**
  - Close it! It locks the COM port
  - Can't have both Serial Monitor and bridge.py running

### Frontend Not Updating
- **Dev server not running**
  - Start it: `cd aeroguard-ui; npm run dev`
  
- **Port 3000 conflict**
  - Kill existing Node processes
  - `Stop-Process -Name node -Force`

### XRPL Transactions Failing
- **UnicodeEncodeError**
  - Already fixed in xrpl_gateway.py (UTF-8 encoding added)
  
- **No NFT Token ID**
  - Check [.env.local](aeroguard-ui/.env.local)
  - Should have: `XRPL_NFT_TOKEN_ID=001800002AD8A3678976F99FAA4DC616FEFA1A120BFB79A0FF85C8340002049A`

---

## 📋 What Happens When You Shake?

1. **Arduino IMU** detects >2.2G acceleration
2. **Arduino** sends `EVENT:CRASH` to bridge.py
3. **bridge.py** notifies:
   - Vultr MCP server (telemetry update + event trigger)
   - Next.js frontend (`/api/arduino/trigger`)
4. **Frontend** triggers emergency cascade:
   - Step 1: Dashboard transition
   - Step 2: XRPL NFTokenModify (URI update)
   - Step 3: XRPL EscrowCreate (100k RLUSD release)
   - Step 4: Voice AI ready for queries
5. **XRPL Devnet** records transactions
6. **ElevenLabs MCP** can query flight status with sensor data

---

## 🎬 Demo Flow

### Scenario: Aircraft Emergency Simulation

1. **Pre-flight:** Normal sensor readings streaming
   ```
   💚 Sync → Temp: 24.5°C, Humidity: 55.2%, G-force: 1.02G
   ```

2. **Crash Event:** Shake Arduino
   ```
   🚨 CRASH DETECTED! G-Force: 2.75G
   ```

3. **Emergency Cascade:** Automated response
   - ✅ Cloud telemetry updated
   - ✅ Frontend alerts
   - ✅ Blockchain proof (NFT URI update)
   - ✅ Rescue funding (Escrow release)

4. **Voice Inquiry:** Radio tower queries AI
   - Human: "What's the aircraft status?"
   - AI: "Flight QR4714: G-force 2.75G. Position 40.8204N, -0.0448E..."

5. **Verification:** Check XRPL Devnet
   - NFT now has crash CID in URI
   - Escrow shows 100k RLUSD locked for rescue team
   - Immutable blockchain proof of event

---

## 🚀 Ready to Test!

**Start here:**
1. Upload Arduino code (takes 5 minutes)
2. Run `python bridge.py`
3. Shake Arduino
4. Watch the cascade!

**Need help?** Check [README_ARDUINO.md](AeroGuard_Arduino/README_ARDUINO.md) for detailed Arduino setup.

**Next:** Configure ElevenLabs API key ([STARTUP_GUIDE.md](STARTUP_GUIDE.md) Step 5-6)
