# Flight Chain

Flight Chain is a Web3 aviation emergency response platform that connects hardware crash detection to decentralized proof, blockchain state updates, and voice-based emergency coordination.

When a crash event is detected, Flight Chain can:
- Capture telemetry from onboard sensors
- Anchor crash evidence to IPFS
- Update an aircraft Digital Twin NFT on XRPL
- Trigger rescue escrow flow
- Broadcast emergency status through an AI voice agent

## What This Project Includes

- Frontend app (Next.js + TypeScript): dashboard, emergency UI, API routes
- Python backend scripts: XRPL, Pinata, MCP, and serial bridge
- Arduino firmware: IMU-based crash detection
- Demo-safe fallbacks: works without API keys using mock mode

## Architecture Overview

1. Arduino IMU detects high G-force and emits a crash signal
2. Python bridge reads serial telemetry and forwards it to APIs
3. Frontend emergency flow executes the 5-step cascade
4. XRPL + IPFS operations run (or mock mode simulates them)
5. Voice agent announces emergency status (or mock voice mode)

## Repository Structure

- aeroguard-ui: Next.js frontend and API routes
- BlockathonKU-shiva: XRPL and Pinata Python scripts
- AeroGuard_Arduino: Arduino Nano 33 BLE Sense firmware
- bridge.py: serial-to-cloud gateway from Arduino to APIs

## Quick Start (Demo Mode, No Keys Required)

This is the easiest path for new users.

1. Install dependencies
- Node.js 18+
- Python 3.10+
- Arduino IDE (optional, only for hardware mode)

2. Run frontend
- Go to aeroguard-ui
- Install packages: npm install
- Start app: npm run dev

3. Open app
- Visit http://localhost:3000/dashboard
- Start emergency mode and test cascade

Demo mode behavior:
- Flight data defaults to demo
- XRPL endpoints auto-fallback to mock when wallet seed is missing
- Voice connection auto-fallbacks to mock chat when ElevenLabs is unavailable

## Full Setup (Live Integrations)

If you want real APIs and blockchain operations, configure environment variables.

### Frontend env file
Create or edit aeroguard-ui/.env.local:

AVIATIONSTACK_API_KEY=your_aviationstack_key
FLIGHT_DATA_MODE=live
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_AGENT_ID=your_agent_id
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id
NEXT_PUBLIC_XRPL_NFT_TOKEN_ID=your_nft_token_id
NEXT_PUBLIC_ESCROW_RLUSD_AMOUNT=100000
NEXT_PUBLIC_RESCUE_TEAM_ADDRESS=your_rescue_wallet
XRPL_WALLET_SEED=your_xrpl_seed

Notes:
- Set FLIGHT_DATA_MODE=demo to force demo flights
- If AVIATIONSTACK_API_KEY is missing or invalid, app falls back to demo flights

### Python env file
Create or edit BlockathonKU-shiva/.env:

PINATA_JWT=your_pinata_jwt
XRPL_WALLET_SEED=your_xrpl_seed
XRPL_WALLET_ADDRESS=your_xrpl_address
XRPL_NETWORK=devnet
XRPL_NFT_TOKEN_ID=your_nft_token_id
ESCROW_RLUSD_AMOUNT=100000
RESCUE_TEAM_ADDRESS=your_rescue_wallet

## Aviationstack API Key (Flight Tracker)

1. Sign up at https://aviationstack.com
2. Open dashboard and copy your access key
3. Put it in aeroguard-ui/.env.local as AVIATIONSTACK_API_KEY
4. Set FLIGHT_DATA_MODE=live

If you skip this, Flight Chain still works in demo mode.

## Hardware Mode (Arduino + Bridge)

1. Open AeroGuard_Arduino/AeroGuard_Arduino.ino in Arduino IDE
2. Select board: Arduino Nano 33 BLE Sense
3. Select the correct COM port
4. Upload firmware
5. From project root, run: python bridge.py

The bridge forwards:
- Sensor updates to frontend Arduino status endpoint
- Crash triggers to emergency endpoint
- Telemetry to MCP flight-status endpoint

## Build and Validate

From aeroguard-ui:
- npm run build

## Security Notes

- Never commit real API keys or wallet seeds
- Keep private keys server-side only
- Use NEXT_PUBLIC_ variables only for non-sensitive frontend values

## Common Troubleshooting

Frontend shows no live flights:
- Ensure FLIGHT_DATA_MODE=live
- Ensure AVIATIONSTACK_API_KEY is set
- If live API fails, app will use demo flights

Voice disconnects:
- Check microphone permission
- Check ElevenLabs key permissions
- If unavailable, app runs in mock voice mode automatically

XRPL errors:
- Verify XRPL_WALLET_SEED for live mode
- If missing, XRPL API returns mock transaction responses

Serial port errors:
- Close Arduino Serial Monitor before running bridge.py
- Verify COM port in bridge.py matches your device

## License

See LICENSE file.
