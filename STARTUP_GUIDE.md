# 🛡️ AeroGuard Complete Setup Guide

**Current Status:** XRPL wallet generated, dependencies installed, ngrok running

---

## ✅ Already Completed

- [x] Python dependencies installed (xrpl-py 4.5.0)
- [x] XRPL Devnet wallet created: `rhuYuMHZweAJSrrannKb3zNnVmQZhtg9iV`
- [x] Wallet seed saved to `.env` files
- [x] Ngrok tunnel running: `https://unequilaterally-tendrillar-kyra.ngrok-free.app`
- [x] ElevenLabs SDK installed (@elevenlabs/client)
- [x] Frontend `/api/xrpl` endpoint created
- [x] Emergency page integrated with XRPL transactions

---

## 🚀 Setup Steps (Start Here)

### **Step 1: Fund XRPL Devnet Wallet** ⏳

**Your wallet needs 1000 XRP on Devnet to mint NFTs and create escrows.**

1. Open in browser: https://faucet.devnet.rippletest.net/
2. Paste your address: `rhuYuMHZweAJSrrannKb3zNnVmQZhtg9iV`
3. Click **"Get 1000 XRP"**
4. Wait 5-10 seconds for confirmation

**Verify funding:**
```powershell
cd C:\Users\HEET\Downloads\BlockathonKU\BlockathonKU-shiva
python fund_devnet.py
```

Expected output:
```
✅ Wallet already funded!
   Balance: 1000.0 XRP (devnet)
```

---

### **Step 2: Start Next.js Development Server** 🖥️

**The dev server must be running for ngrok to work.**

```powershell
cd C:\Users\HEET\Downloads\BlockathonKU\aeroguard-ui
npm run dev
```

Expected output:
```
▲ Next.js 15.x
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000

✓ Starting...
✓ Ready in 3.2s
```

**✅ Leave this terminal running. Open a new PowerShell window for next steps.**

**Verify ngrok:**
Open: https://unequilaterally-tendrillar-kyra.ngrok-free.app
You should see the AeroGuard dashboard (not a 502 error).

---

### **Step 3: Mint Aircraft Dynamic NFT** ✈️

**Creates XLS-46d mutable NFT for flight QR4714.**

**Open a NEW PowerShell window:**
```powershell
cd C:\Users\HEET\Downloads\BlockathonKU\BlockathonKU-shiva
python xrpl_gateway.py mint QR4714 QmNominalFlightDataCID
```

Expected output:
```
✅ Aircraft NFT minted!
   Token ID: 000100001A9F7F3E2D8B4C5F...
   Transaction: https://devnet.xrpl.org/transactions/ABC123...
```

**Copy the Token ID** and run:
```powershell
cd ..\aeroguard-ui
```

Then edit [.env.local](aeroguard-ui/.env.local):
```env
XRPL_NFT_TOKEN_ID=000100001A9F7F3E2D8B4C5F...
NEXT_PUBLIC_XRPL_NFT_TOKEN_ID=000100001A9F7F3E2D8B4C5F...
```

**Restart the dev server** (Ctrl+C in dev server terminal, then `npm run dev` again).

---

### **Step 4: Create ElevenLabs API Key with Permissions** 🔑

**Current key lacks "ElevenAgents Write" permission.**

1. Go to: https://elevenlabs.io/app/settings/api-keys
2. Click **"Create New API Key"**
3. Name: `AeroGuard ConversationalAI`
4. Enable permissions:
   - ✅ **ElevenAgents → Write**
   - ✅ Text to Speech → Read
   - ✅ Text to Speech → Write
5. Copy the new key (starts with `sk_...`)

Edit [aeroguard-ui/.env.local](aeroguard-ui/.env.local):
```env
ELEVENLABS_API_KEY=sk_YOUR_NEW_KEY_HERE
```

**Restart dev server** after updating.

---

### **Step 5: Configure ElevenLabs MCP Server** 🌐

**Update agent to use ngrok HTTPS endpoint.**

1. Go to: https://elevenlabs.io/app/conversational-ai
2. Select agent: **Young Jamal** (`agent_7401kk534kwsfmqtdwgbsfsagvv5`)
3. Click **"Tools"** or **"MCP Servers"**
4. Find existing MCP server (Vultr) or add new one
5. Update settings:
   - **URL:** `https://unequilaterally-tendrillar-kyra.ngrok-free.app/api/mcp/flight-status`
   - **Transport:** SSE
   - **Method:** GET
6. Click **"Test Connection"**
   - Should turn ✅ green
   - Should show: `get_flight_status` tool available

**System Prompt (verify it's configured):**
```
You are AeroGuard emergency AI. NO introductions. Get straight to data.
When asked for status, IMMEDIATELY call get_flight_status tool.
Report: Flight [callsign]: G-force [value]G. Position [lat]N, [lon]E. 
Altitude [feet]ft. Temperature [C]C, Pressure [kpa]kPa, Humidity [%]%. 
IPFS: [hash]. XRPL: [hash].
Under 30 seconds. Professional tone.
```

---

### **Step 6: Test Full System** 🧪

#### **A. Test Frontend Dashboard**
1. Open: http://localhost:3000/dashboard
2. Should show "Monitoring QR4714"
3. Click **"Emergency"** button

#### **B. Test Arduino Crash Detection**
**Open another PowerShell window:**
```powershell
cd C:\Users\HEET\Downloads\BlockathonKU
python bridge.py
```

**Shake your Arduino Nano 33 BLE Sense hard (>2.2G)**

Expected cascade:
1. ✅ Arduino sends `EVENT:CRASH`
2. ✅ bridge.py posts to Vultr MCP + frontend
3. ✅ Dashboard transitions to emergency mode
4. ✅ NFT step: NFTokenModify updates URI
5. ✅ Escrow step: EscrowCreate releases 100k RLUSD
6. ✅ Console logs XRPL transaction hashes
7. ✅ Voice conversation starts

#### **C. Test Voice AI**
1. In emergency page, click **🎤 microphone button**
2. Say: *"What's the aircraft status?"*
3. Agent should respond with:
   - Flight QR4714 data
   - G-force: 4.2G+
   - Position coordinates
   - Altitude, temperature, pressure, humidity
   - IPFS CID
   - XRPL transaction hash

#### **D. Verify Blockchain Transactions**
Open: https://devnet.xrpl.org/
Search for your wallet: `rhuYuMHZweAJSrrannKb3zNnVmQZhtg9iV`

Should see:
- NFTokenMint transaction (from Step 3)
- NFTokenModify transaction (URI update during crash)
- EscrowCreate transaction (100k RLUSD locked)

---

## 🐛 Troubleshooting

### Dev server won't start
```powershell
# Kill all Node processes
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Remove lock file
Remove-Item "C:\Users\HEET\Downloads\BlockathonKU\aeroguard-ui\.next" -Recurse -Force -ErrorAction SilentlyContinue

# Try again
cd C:\Users\HEET\Downloads\BlockathonKU\aeroguard-ui
npm run dev
```

### Ngrok shows 502 Bad Gateway
- Dev server isn't running on port 3000
- Start dev server first, then check ngrok URL

### Arduino not detected (COM6)
```powershell
# Close Arduino IDE Serial Monitor
# Then run:
python bridge.py
```

### ElevenLabs API 401 error
- API key missing `convai_write` permission
- Create new key in Step 4

### MCP server shows disconnected
- Must use HTTPS (ngrok), not localhost
- Update URL in ElevenLabs agent settings (Step 5)

### NFT minting fails
- Wallet not funded on Devnet
- Run `python fund_devnet.py` to check balance
- Fund at https://faucet.devnet.rippletest.net/

---

## 📋 Quick Reference

**Wallet Address:** `rhuYuMHZweAJSrrannKb3zNnVmQZhtg9iV`

**Agent ID:** `agent_7401kk534kwsfmqtdwgbsfsagvv5`

**Ngrok URL:** `https://unequilaterally-tendrillar-kyra.ngrok-free.app`

**MCP Endpoint:** `/api/mcp/flight-status`

**XRPL Network:** Devnet (`https://s.devnet.rippletest.net:51234`)

**Flight Callsign:** QR4714

---

## 🎯 What Each Component Does

- **Arduino Nano 33 BLE Sense:** IMU sensor detects >2.2G crash
- **bridge.py:** Serial gateway, sends telemetry to Vultr MCP + frontend
- **Vultr MCP Server:** FastAPI with `get_flight_status` tool
- **Next.js Frontend:** Dashboard, emergency UI, XRPL API integration
- **XRPL Devnet:** Dynamic NFT URI updates + escrow release
- **ElevenLabs Voice AI:** Conversational agent with sensor data context
- **Ngrok:** HTTPS tunnel for ElevenLabs to reach MCP server

---

**Start with Step 1 above! ☝️**
