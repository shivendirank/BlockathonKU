# 🚀 Vercel Deployment Guide - FlightChain

## ⚠️ Important: What Goes Where

### ✅ Vercel (Cloud) - Next.js Frontend
- **Dashboard** (flightchain/)
- **Emergency UI**
- **API Routes** (/api/flights, /api/elevenlabs/connect, /api/mcp/flight-status)
- **Public URL**: https://flightchain.vercel.app

### ❌ CANNOT Deploy to Vercel (Must Stay Local)
- **Arduino hardware** - needs USB connection to your computer
- **bridge.py** - Python script that reads Arduino USB serial data
- **XRPL Python scripts** - BlockathonKU-shiva/ (needs Python runtime)

### ✅ Already Deployed (Vultr VPS)
- **MCP Server**: http://45.76.31.34:8000
- **FastAPI backend** with get_flight_status tool

---

## 🏗️ System Architecture After Vercel

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 VERCEL (CLOUD)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js Dashboard (https://flightchain.vercel.app)   │   │
│  │  • /dashboard                                        │   │
│  │  • /emergency                                        │   │
│  │  • /api/flights (flight data)                       │   │
│  │  • /api/elevenlabs/connect (voice AI)              │   │
│  │  • /api/mcp/flight-status (MCP endpoint)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓  ↑
                     (Public Internet)
                          ↓  ↑
┌─────────────────────────────────────────────────────────────┐
│              💻 YOUR LOCAL MACHINE (MUST RUN)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Arduino Nano 33 BLE Sense (USB on COM6)           │   │
│  │           ↓                                          │   │
│  │  bridge.py (Python) - Reads serial data             │   │
│  │           ↓                                          │   │
│  │  Sends crash data to:                               │   │
│  │    → Vercel frontend (your deployed URL)            │   │
│  │    → Vultr MCP server (45.76.31.34:8000)           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  BlockathonKU-shiva/ (Python XRPL scripts)          │   │
│  │  • xrpl_gateway.py (NFT mint/update)                │   │
│  │  • Run manually or via local API                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓  ↑
┌─────────────────────────────────────────────────────────────┐
│                  🖥️ VULTR VPS (CLOUD)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MCP Server (http://45.76.31.34:8000)              │   │
│  │  • FastAPI + SSE transport                          │   │
│  │  • get_flight_status tool                           │   │
│  │  • Stores telemetry data                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓  ↑
┌─────────────────────────────────────────────────────────────┐
│              🎤 ELEVENLABS (EXTERNAL API)                   │
│  • Conversational AI agent                                  │
│  • Queries MCP server for flight status                    │
│  • Voice input/output                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step: Deploy to Vercel

### 1. Prepare Your Code

#### A. Update bridge.py with Vercel URL
Edit [bridge.py](bridge.py) line 7:
```python
# Change from localhost to your Vercel URL (after deployment)
FRONTEND_URL = "https://flightchain.vercel.app"  # Update this after deploying
```

#### B. Remove /api/xrpl Route (Python dependency)
The `/api/xrpl` endpoint calls Python scripts which won't work on Vercel.

**Option 1:** Remove it (XRPL operations stay local)
- Delete: `flightchain/src/app/api/xrpl/route.ts`

**Option 2:** Keep it but it won't work on Vercel
- XRPL transactions will fail in production
- You'll need to run them manually from your local machine

#### C. Create vercel.json
```powershell
cd flightchain
```

Create `vercel.json`:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://flightchain.vercel.app"
  }
}
```

### 2. Install Vercel CLI

```powershell
npm install -g vercel
```

### 3. Login to Vercel

```powershell
cd C:\Users\HEET\Downloads\BlockathonKU\flightchain
vercel login
```

Follow the prompts to authenticate.

### 4. Deploy

```powershell
vercel
```

**First deployment prompts:**
- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- Project name? **flightchain** (or custom name)
- Directory? **./flightchain** (current directory)
- Override settings? **N**

**Vercel will:**
1. Build your Next.js app
2. Deploy to production
3. Give you a URL: `https://flightchain-xxxxx.vercel.app`

### 5. Set Environment Variables

Go to: https://vercel.com/your-username/flightchain/settings/environment-variables

Add these (from your `.env.local`):

```
ELEVENLABS_API_KEY = sk_c163031171782dfd03092a635c9984a09047ad231fafda75
ELEVENLABS_AGENT_ID = agent_7401kk534kwsfmqtdwgbsfsagvv5
NEXT_PUBLIC_XRPL_NFT_TOKEN_ID = 001800002AD8A3678976F99FAA4DC616FEFA1A120BFB79A0FF85C8340002049A
NEXT_PUBLIC_ESCROW_RLUSD_AMOUNT = 100000
NEXT_PUBLIC_RESCUE_TEAM_ADDRESS = rN7n7otQDd6FczFgLdllmHNwSueY2sPfwgnn
```

**DO NOT ADD** (these have secrets):
- ❌ XRPL_WALLET_SEED (keep secret, local only)
- ❌ XRPL_WALLET_ADDRESS (not needed in frontend)

### 6. Update bridge.py with Vercel URL

After deployment, copy your Vercel URL (e.g., `https://flightchain-xxxxx.vercel.app`)

Edit [bridge.py](bridge.py):
```python
FRONTEND_URL = "https://flightchain-xxxxx.vercel.app"  # Your actual Vercel URL
```

### 7. Redeploy (if needed)

If you make changes:
```powershell
cd aeroguard-ui
vercel --prod
```

---

## 🧪 Testing After Deployment

### 1. Test Dashboard
Open: https://flightchain-xxxxx.vercel.app/dashboard

Should see:
- Flight monitoring interface
- "Monitoring QR4714"

### 2. Test Arduino Integration (Local)

On your computer:
```powershell
cd C:\Users\HEET\Downloads\BlockathonKU
python bridge.py
```

Shake Arduino → Should POST to:
- ✅ Vercel frontend (your new URL)
- ✅ Vultr MCP server

### 3. Check Vercel Logs

```powershell
vercel logs
```

Or visit: https://vercel.com/your-username/flightchain/deployments

---

## 🔧 What Stays Local vs Cloud

| Component | Location | Why |
|-----------|----------|-----|
| **Next.js Dashboard** | ☁️ Vercel | Serverless hosting, global CDN |
| **Arduino + bridge.py** | 💻 Local | Needs USB serial connection |
| **XRPL Python scripts** | 💻 Local | Needs Python runtime, wallet seed |
| **Vultr MCP Server** | ☁️ VPS | Already deployed, FastAPI backend |
| **ElevenLabs** | ☁️ External | Third-party API |

---

## 🚨 Important: Running After Deployment

### When Demonstrating the System:

**1. Keep Local Services Running:**
```powershell
# Terminal 1: Arduino bridge
cd C:\Users\HEET\Downloads\BlockathonKU
python bridge.py

# Terminal 2: (Optional) Dev server for local testing
cd aeroguard-ui
npm run dev
```

**2. Access Public Dashboard:**
- Your audience visits: `https://flightchain.vercel.app/dashboard`
- You shake Arduino locally
- Crash data flows: Arduino → bridge.py → Vercel → Dashboard updates globally

**3. ElevenLabs MCP:**
Update agent MCP URL to:
- **Option A (Ngrok - Local)**: `https://your-ngrok-url.ngrok-free.app/api/mcp/flight-status`
- **Option B (Vercel - Cloud)**: `https://flightchain.vercel.app/api/mcp/flight-status`

---

## 🔐 Security Notes

### Environment Variables on Vercel:
- ✅ **ELEVENLABS_API_KEY**: Safe (Vercel encrypts secrets)
- ✅ **ELEVENLABS_AGENT_ID**: Safe (public-facing)
- ✅ **NEXT_PUBLIC_*** : Public (exposed in browser)
- ❌ **XRPL_WALLET_SEED**: ⚠️ NEVER add to Vercel (keep local)

### XRPL Transactions:
Since `/api/xrpl` won't work on Vercel (Python dependency), handle XRPL operations:
1. **Remove from emergency page** (delete XRPL API calls)
2. **Run manually** from local machine when needed
3. **OR migrate to Python cloud service** (Railway, Render, Fly.io)

---

## 🎯 Alternative: Full Cloud Setup (Advanced)

If you want XRPL operations in the cloud:

1. **Vercel**: Frontend (Next.js)
2. **Railway/Render**: Python backend (xrpl_gateway.py as FastAPI)
3. **Vultr**: MCP server (keep as-is)
4. **Local**: Arduino + bridge.py (must stay local)

Would you like a guide for this setup?

---

## 📋 Quick Checklist

- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Remove/comment `/api/xrpl` route (optional)
- [ ] Deploy: `cd flightchain && vercel`
- [ ] Add environment variables on Vercel dashboard
- [ ] Update bridge.py with Vercel URL
- [ ] Test: Visit your Vercel URL
- [ ] Run bridge.py locally for Arduino connection
- [ ] Update ElevenLabs MCP URL to Vercel

---

**Ready to deploy?** Run `cd flightchain && vercel` to start!
