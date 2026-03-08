# XRPL Devnet Setup Guide for FlightChain

## 🚀 Quick Start

### 1. **Install Python Dependencies**

```bash
cd BlockathonKU-shiva
pip install -r requirements.txt
```

### 2. **Generate Devnet Wallet**

```bash
python xrpl_setup.py
```

This will:
- Create a new wallet on XRPL Devnet
- Fund it with XRP from the faucet
- Display your wallet seed and address
- Save wallet info to `.env`

**Copy the wallet seed** to `.env.local`:
```env
XRPL_WALLET_SEED=sYourDevnetWalletSeed...
XRPL_NETWORK=devnet
```

### 3. **Mint Aircraft Dynamic NFT (XLS-46d)**

```bash
python xrpl_gateway.py mint QR4714 QmNominalFlightDataCID
```

Returns:
```json
{
  "nft_token_id": "000100001E962F495F07A990F4ED55D2410B5D63A5C",
  "hash": "ABC123...",
  "uri": "ipfs://QmNominalFlightDataCID"
}
```

**Copy the NFT Token ID** to `.env.local`:
```env
XRPL_NFT_TOKEN_ID=000100001E962F495F07A990F4ED55D2410B5D63A5C
NEXT_PUBLIC_XRPL_NFT_TOKEN_ID=000100001E962F495F07A990F4ED55D2410B5D63A5C
```

### 4. **Start Dev Server**

```bash
cd ../flightchain
npm run dev
```

### 5. **Simulate Crash & Watch XRP Ledger**

1. Shake Arduino or simulate crash
2. Watch console logs for XRPL transactions
3. Check Devnet explorer: https://devnet.xrpl.org/

## 🔧 API Endpoints

### `/api/xrpl` (POST)

**Mint NFT:**
```json
{
  "action": "mint",
  "data": {
    "aircraft_id": "QR4714",
    "nominal_cid": "QmNominalCID"
  }
}
```

**Update NFT (on crash):**
```json
{
  "action": "update",
  "data": {
    "nft_token_id": "000100001E962F495F07A990F4ED55D2410B5D63A5C",
    "crash_cid": "QmCrashEvidenceCID"
  }
}
```

**Create Escrow:**
```json
{
  "action": "escrow_create",
  "data": {
    "amount": "100000",
    "destination": "rRescueTeamAddress...",
    "finish_after": 1234567890
  }
}
```

**Release Escrow:**
```json
{
  "action": "escrow_finish",
  "data": {
    "escrow_sequence": 123,
    "owner": "rAirlineWalletAddress..."
  }
}
```

## 📊 How It Works

### 1. **Pre-Flight**: Mint Dynamic NFT (XLS-46d)

Aircraft gets a Digital Twin NFT with "nominal" IPFS CID pointing to normal flight data.

### 2. **In-Flight**: Arduino collects telemetry

IMU sensor streams temperature, G-force, humidity to bridge.py → Vultr MCP server.

### 3. **Crash Detection**: G-force > 3.5G

- Arduino sends EVENT:CRASH
- bridge.py pushes telemetry to Pinata → gets crash CID
- bridge.py notifies frontend API

### 4. **NFT Update**: NFTokenModify (XLS-46d)

Frontend calls `/api/xrpl` to update NFT URI from nominal CID to crash CID.

**On XRPL Devnet:**
```
NFTokenModify transaction submitted
NFT URI: ipfs://QmNominal... → ipfs://QmCrashEvidence...
```

### 5. **Escrow Release**: Conditional payment

RLUSD escrow created at flight start. On crash:
- EscrowFinish triggered
- 100,000 RLUSD → rescue team wallet
- Immutable proof on blockchain

### 6. **Voice AI**: ElevenLabs queries MCP

Agent calls `get_flight_status` tool → retrieves real sensor data from Vultr → speaks with Young Jamal voice.

## 🔗 Useful Links

- **XRPL Devnet Explorer**: https://devnet.xrpl.org/
- **XRPL Devnet Faucet**: https://faucet.devnet.rippletest.net/
- **XLS-46d Spec**: https://github.com/XRPLF/XRPL-Standards/discussions/46
- **XRPL.js Docs**: https://js.xrpl.org/

## 🐛 Troubleshooting

**"No wallet seed" error:**
```bash
cd BlockathonKU-shiva
python xrpl_setup.py
```

**"NFToken not found" error:**
- Make sure you minted the NFT first
- Copy NFT Token ID to `.env.local`

**"502 Bad Gateway" on XRPL API:**
- Check Python dependencies installed: `pip install -r requirements.txt`
- Verify xrpl_gateway.py path in `/api/xrpl/route.ts`

**"tecNO_PERMISSION" on NFTokenModify:**
- Ensure NFT was minted with `tfMutable` flag (flag 16)
- Check wallet owns the NFT

## 🎯 Next Steps

1. Generate Devnet wallet: `python xrpl_setup.py`
2. Mint aircraft NFT: `python xrpl_gateway.py mint ...`
3. Add NFT Token ID to `.env.local`
4. Test crash detection with Arduino
5. Watch XRPL Devnet for transactions!
