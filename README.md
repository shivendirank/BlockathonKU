# FlightChain Pinata Setup Guide

Everything is ready! Here's your 5-minute setup:

## 📁 Files Created

- **pinata_gateway.py** — Handles pinning telemetry to IPFS, retrieving crash evidence
- **FlightChain_mcp_server.py** — MCP server that lets ElevenLabs AI call Pinata tools
- **mcp_config.json** — Configuration for ElevenLabs integration
- **requirements.txt** — Python dependencies
- **.env.example** — Template for your environment variables

---

## ✅ Quick Setup (5 steps)

### Step 1: Open Terminal in VS Code
Press **Ctrl+`** (backtick) to open the built-in terminal

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Set Your Pinata JWT (Windows)
```bash
set PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` with your actual JWT from Pinata.

**Need your JWT?**
1. Go to https://app.pinata.cloud
2. Click your avatar → **API Keys**
3. Click the JWT token you created (should have pinFileToIPFS + pinJSONToIPFS enabled)
4. Copy the JWT and paste it into the command above

### Step 4: Test Pinata Connection
```bash
python pinata_gateway.py
```

You should see:
```
✅ Pinata authentication successful!
✅ Pinned to IPFS: FlightChain_nominal_flight
   CID: Qm...
✅ Pinned to IPFS: FlightChain_crash_event
   CID: Qm...
✅ All tests passed! Pinata is ready.
```

### Step 5: Start the MCP Server
In the same terminal:
```bash
python FlightChain_mcp_server.py
```

You should see:
```
🛡️  FlightChain MCP Server starting...
   Pinata JWT  : SET ✅
🛠️  Available Tools:
   ✓ get_flight_status
   ✓ get_crash_evidence
   ✓ declare_emergency
   ✓ get_escrow_status
   ✓ list_recent_events
```

---

## 🔗 What Each File Does

| File | Purpose | Called By |
|------|---------|-----------|
| **pinata_gateway.py** | Core Pinata API wrapper | MCP server, Arduino gateway |
| **FlightChain_mcp_server.py** | 5 tools for ElevenLabs AI | ElevenLabs voice agent during demo |
| **mcp_config.json** | ElevenLabs integration config | ElevenLabs setup screen |

---

## 🎯 The Demo Flow

1. **Arduino shakes** → Triggers Python gateway
2. **Python calls `declare_emergency()`** → pins crash telemetry to Pinata
3. **Pinata returns a CID** → e.g., `QmAb...xyz`
4. **MCP server stores that CID** in global state
5. **ElevenLabs AI initiates mayday** using the MCP tools
6. **Judge asks "prove it"** → AI calls `get_crash_evidence()` → reads CID aloud
7. **Judge checks escrow** → AI calls `get_escrow_status()` → shows RELEASE_PENDING

---

## 🔧 Integration Checklist

Before your demo:

- [ ] Pinata JWT set in environment variable
- [ ] `python pinata_gateway.py` passes all tests
- [ ] MCP server starts without errors
- [ ] Have your Pinata CIDs ready to show to judges
- [ ] (Optional) XRPL wallet seed in `.env` for NFTokenModify

---

## 📚 Key Concepts

### Why Pinata + XRPL?

- **Pinata** = Where the crash data lives (JSON telemetry)
- **XRPL** = Where the proof lives (CID hash in NFT URI)

When Arduino detects a crash:
1. Telemetry gets pinned to IPFS via Pinata → **CID returned**
2. CID gets inserted into NFT URI field on XRPL → **NFTokenModify tx**
3. ElevenLabs AI reads the CID aloud → **Live proof**

### The MCP Tools (What ElevenLabs Can Do)

| Tool | What It Does |
|------|-------------|
| `get_flight_status` | "What's the current status?" |
| `get_crash_evidence` | "Prove the crash happened" (reads CID) |
| `declare_emergency` | Pins crash to IPFS + flags escrow |
| `get_escrow_status` | "Where's the rescue money?" |
| `list_recent_events` | "Show me the timeline" |

---

## 🚀 Next Steps

Once Pinata is working:

1. **Build the XRPL side** — Mint Dynamic NFT, wire up NFTokenModify
2. **Wire the Arduino** — Connect crash detection to Python gateway
3. **Configure ElevenLabs** — Point it to `mcp_config.json` and start voice agent
4. **End-to-end test** — Shake Arduino → see Pinata CID → hear AI read proof

---

## ❓ Troubleshooting

**"PINATA_JWT environment variable not set"**
- Make sure you ran `set PINATA_JWT=...` before testing
- Check environment variable is set: `echo %PINATA_JWT%`

**"Failed to pin: 401"**
- Your JWT is invalid or expired
- Go back to Pinata dashboard, regenerate API key, re-paste JWT

**"Connection error"**
- Check your internet connection
- Make sure `requests` is installed: `pip install requests`

**MCP server won't start**
- Make sure `mcp` package is installed: `pip install mcp`
- Check Python version is 3.8+: `python --version`

---

## 📞 Support

All code is documented. Check the docstrings in each file:
- `pinata_gateway.py` → `pin_crash_event()` docstring shows the exact crash JSON format
- `FlightChain_mcp_server.py` → `declare_emergency()` shows the full flow

Good luck at Blockathon! 🚀
