# ElevenLabs Configuration Guide

## Setup Instructions

### 1. Get Your ElevenLabs Keys

1. Go to [ElevenLabs](https://elevenlabs.io)
2. Sign in to your account
3. Navigate to **Profile Settings** → **API Keys**
4. Copy your API Key
5. Go to **Conversational AI** section
6. Find your Agent ID (looks like: `agent_xxxxxxxxxxxxx`)

### 2. Update Environment Variables

Edit `aeroguard-ui/.env.local` and add:

```env
# ElevenLabs Configuration
ELEVENLABS_API_KEY=sk_your_actual_api_key_here
ELEVENLABS_AGENT_ID=agent_your_agent_id_here
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=agent_your_agent_id_here
```

### 3. Configure Your ElevenLabs Agent

In the ElevenLabs dashboard, configure your agent with:

**Agent Purpose:**
```
You are an emergency aviation AI assistant integrated into the AeroGuard system. 
When a flight crashes, you receive real-time telemetry data via MCP (Model Context Protocol).
Your role is to:
1. Acknowledge emergency situations with urgency
2. Summarize flight data (altitude, speed, position, G-force, temperature)
3. Coordinate with air traffic control
4. Provide status updates on blockchain verification (XRPL NFT, IPFS anchoring, escrow release)
5. Guide search and rescue operations
```

**Knowledge Base:**
- Flight telemetry interpretation
- Emergency response protocols
- Blockchain transaction confirmation
- IPFS data anchoring
- XRPL Digital Twin NFT system

### 4. Test the Integration

1. Run the Next.js app: `npm run dev`
2. Run bridge.py: `python bridge.py`
3. Navigate to emergency page
4. Shake Arduino or manually trigger crash
5. Type messages as  "Radio Tower" and watch ElevenLabs respond!

### 5. What Gets Sent to ElevenLabs

When you type a message, the system sends:
```json
{
  "message": "Your radio tower message",
  "flightData": {
    "callsign": "AF 1680",
    "aircraft": "Airbus A319",
    "route": "CDG → BCN",
    "currentPos": [2.3385, 45.5405],
    "altitude": 35680,
    "speed": 472,
    "gForce": 2.5,
    "temp": 28.4
  }
}
```

The agent uses this data via MCP to provide contextual, intelligent responses!

## How It Works

1. **Crash Detected** → Arduino sends G-force spike
2. **bridge.py** → Notifies frontend via `/api/arduino/trigger`
3. **Emergency Page** → Shows crash cascade + activates ElevenLabs
4. **Initial Mayday** → Agent automatically announces emergency
5. **You Type** → Messages sent to ElevenLabs API
6. **Agent Responds** → Uses MCP to access flight data and respond intelligently
7. **Transcript** → Shows conversation between Radio Tower (you) and Agent

## Troubleshooting

- **"Agent ID not configured"** → Update `.env.local` with your agent ID
- **No response from agent** → Check ELEVENLABS_API_KEY is valid
- **Agent doesn't know flight details** → Ensure MCP integration is configured in ElevenLabs dashboard
