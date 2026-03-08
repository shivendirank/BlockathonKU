import asyncio
from mcp.server import Server
from mcp.server.sse import SseServerTransport
from fastapi import FastAPI, Request
import uvicorn

mcp_server = Server("AeroGuard_Cloud")
app = FastAPI()
sse = SseServerTransport("/messages")

current_status = "STABLE"
telemetry = {
    "temp": "0.0", 
    "hum": "0.0", 
    "g": "0.0",
    "pressure": "0.0",
    "altitude": "0",
    "latitude": "0.0",
    "longitude": "0.0",
    "ipfs_cid": "",
    "xrpl_tx": "",
    "flight_callsign": "UNKNOWN"
}

@mcp_server.list_tools()
async def list_tools():
    return [{"name": "get_flight_status", "description": "Get real-time plane sensors."}]

@mcp_server.call_tool()
async def call_tool(name, arguments):
    global current_status, telemetry
    if name == "get_flight_status":
        # Extract sensor data
        temp = telemetry.get('temp', '0.0')
        hum = telemetry.get('hum', '0.0')
        gforce = telemetry.get('g', '0.0')
        pressure = telemetry.get('pressure', '0.0')
        altitude = telemetry.get('altitude', '0')
        lat = telemetry.get('latitude', '0.0')
        lon = telemetry.get('longitude', '0.0')
        ipfs = telemetry.get('ipfs_cid', 'Not available')
        xrpl = telemetry.get('xrpl_tx', 'Not available')
        callsign = telemetry.get('flight_callsign', 'UNKNOWN')
        
        # Build detailed report
        report = (
            f"Flight {callsign}: G-force {gforce}G recorded. "
            f"Position {lat} north, {lon} east. "
            f"Altitude {altitude} feet. "
            f"Temperature {temp} celsius, Pressure {pressure} kilopascals, Humidity {hum} percent. "
            f"IPFS CID: {ipfs}. XRPL transaction: {xrpl}."
        )
        
        if current_status == "STABLE":
            return [{"type": "text", "text": f"Status nominal. {report}"}]
        elif current_status == "TURBULENCE":
            return [{"type": "text", "text": f"Warning: Turbulence detected. {report}"}]
        else:
            return [{"type": "text", "text": f"EMERGENCY: Catastrophic impact detected. {report} Escrow released."}]

@app.post("/update_telemetry")
async def update_telemetry(request: Request):
    global telemetry
    telemetry = await request.json()
    return {"status": "ok"}

@app.post("/trigger_event")
async def trigger_event(request: Request):
    global current_status
    data = await request.json()
    current_status = data.get("status", "STABLE")
    print(f"☁️ CLOUD UPDATED: {current_status}")
    return {"status": "ok"}

@app.get("/sse")
async def handle_sse(request: Request):
    async with sse.connect_sse(request.scope, request.receive, request.send) as (read, write):
        await mcp_server.run(read, write, mcp_server.create_initialization_options())

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)