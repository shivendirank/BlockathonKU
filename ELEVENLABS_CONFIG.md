# ElevenLabs Agent Configuration for FlightChain

## 🎯 Agent Settings to Update

### 1. System Prompt (Replace completely)

```
You are FlightChain emergency AI. NO introductions. NO greetings. Get straight to data.

When asked "what's the status" or similar, IMMEDIATELY call get_flight_status tool.

Report format:
"Flight [callsign]: G-force [value]G recorded. Position [lat]N, [lon]E. Altitude [feet] feet. Temperature [celsius]C, Pressure [kpa] kilopascals. IPFS CID: [hash]. XRPL transaction: [hash]. Escrow status: [released/pending]."

Keep responses under 30 seconds. Professional emergency responder tone.
```

### 2. Tool Configuration: get_flight_status

**Tool Name:** `get_flight_status`

**Description:**
```
Retrieves real-time emergency flight data including:
- GPS coordinates (latitude/longitude)  
- Altitude in feet
- G-force from accelerometer
- Temperature sensor (Celsius)
- Pressure sensor (kPa)
- Humidity sensor (%)
- IPFS CID for crash telemetry
- XRPL transaction hash
- Escrow release status
```

**Tool URL:**
```
http://localhost:3000/api/mcp/flight-status
```

OR if testing remotely, use your deployed URL or ngrok tunnel.

**Method:** `GET`

**Authentication:** None (if local) or add your auth header

### 3. First Message (Optional - Leave Empty)

Leave the "First message" field **EMPTY** so agent doesn't introduce itself.

### 4. Voice Settings

- **Voice:** Young Jamal (already set)
- **Interruptions:** Enable
- **Responsiveness:** High

## 🔧 Testing Your Configuration

### Test Query 1: "What's the status?"

**Expected Response:**
```
Flight QR4714: G-force 4.2G recorded. Position 40.82 north, negative 0.04 east. 
Altitude 40,068 feet. Temperature 28.4 celsius, Pressure 85.3 kilopascals. 
IPFS CID: QmCrash7x8k2j4m9n1p5q6r. XRPL transaction: F4A2C9E1B3D7. 
Escrow status: Released, 100,000 RLUSD.
```

### Test Query 2: "Temperature and pressure readings?"

**Expected Response:**
```
Temperature: 28.4 degrees celsius. Pressure: 85.3 kilopascals. 
Humidity: 45.2 percent. Vibration: anomalous.
```

### Test Query 3: "Where is the aircraft?"

**Expected Response:**
```
Position: 40.8204 north, 0.0448 west. Altitude: 40,068 feet. 
Last known route: Doha to New York JFK.
```

## 📡 How It Works

1. **Crash Detection:** Arduino → bridge.py → Frontend API
2. **Data Storage:** Crash data posted to `/api/mcp/flight-status`
3. **Agent Query:** ElevenLabs agent calls `get_flight_status` tool via MCP
4. **Response:** Agent receives JSON with all sensor data
5. **Voice Output:** Agent speaks the data in professional emergency tone

## 🚀 Quick Start

1. Update your agent's system prompt (copy from above)
2. Configure `get_flight_status` tool with URL
3. Test in ElevenLabs preview before deploying
4. Once working, connect to your frontend

## 🔒 Security (Production)

For production, secure the endpoint:
- Add API key authentication
- Use HTTPS only
- Rate limiting
- CORS configuration

Current setup is for local development/testing.
