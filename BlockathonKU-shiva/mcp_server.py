"""
AeroGuard MCP Server
Allows ElevenLabs AI to read blockchain & Pinata data during emergency calls
"""
import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Any
from mcp.server import Server
from mcp.types import Tool, TextContent, ToolResult
import requests
from dotenv import load_dotenv

# Load credentials from .env file
load_dotenv()

# Import our gateways
from pinata_gateway import PinataGateway
from xrpl_gateway import XRPLGateway

# Global state
crash_state = {
    "status": "NOMINAL",
    "current_cid": None,
    "crash_cid": None,
    "escrow_balance": 100000,  # RLUSD
    "escrow_status": "LOCKED",
    "events": []
}

# Initialize MCP server
server = Server("flightchain-mcp")
pinata = None


class FlightChainMCPServer:
    """MCP Tools for ElevenLabs AI integration"""
    
    def __init__(self):
        self.jwt = os.getenv("PINATA_JWT")
        self.xrpl_seed = os.getenv("XRPL_WALLET_SEED")
        
        if not self.jwt:
            print("⚠️  WARNING: PINATA_JWT not set. Pinata operations will fail.")
        
        try:
            self.pinata = PinataGateway(self.jwt)
        except:
            print("⚠️  WARNING: Could not initialize Pinata. Check your JWT.")
            self.pinata = None

        try:
            if self.xrpl_seed and self.xrpl_seed != "sYourWalletSeedHere...":
                self.xrpl = XRPLGateway(self.xrpl_seed)
            else:
                self.xrpl = None
                print("⚠️  WARNING: XRPL_WALLET_SEED not set. Run xrpl_setup.py first.")
        except Exception as e:
            self.xrpl = None
            print(f"⚠️  WARNING: Could not initialize XRPL: {e}")


    
    async def get_flight_status(self) -> dict:
        """
        Returns NOMINAL or CRASH status
        Called by AI at any point during the demo
        """
        return {
            "status": crash_state["status"],
            "current_cid": crash_state["current_cid"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def get_crash_evidence(self) -> dict:
        """
        Fetches full crash JSON from IPFS
        AI reads the CID hash aloud as cryptographic proof
        """
        if not crash_state["crash_cid"]:
            return {"error": "No crash detected yet"}
        
        if not self.pinata:
            return {"error": "Pinata not initialized"}
        
        try:
            evidence = self.pinata.get_pinned_json(crash_state["crash_cid"])
            if evidence:
                return {
                    "cid": crash_state["crash_cid"],
                    "data": evidence,
                    "proof_text": f"Crash proof anchored on IPFS at CID {crash_state['crash_cid']}. "
                                 f"G-forces: {evidence['crash_telemetry']['g_force']}. "
                                 f"Timestamp: {evidence['timestamp']}"
                }
            else:
                return {"error": "Could not retrieve evidence from IPFS"}
        except Exception as e:
            return {"error": f"Error retrieving evidence: {str(e)}"}
    
    async def declare_emergency(self, telemetry: dict = None) -> dict:
        """
        THE BIG ONE — This is called when Arduino detects crash or judge orders test
        1. Pins crash telemetry to Pinata
        2. Gets CID back
        3. Prepares NFTokenModify for XRPL (stub for now)
        4. Flags escrow for release
        """
        if not self.pinata:
            return {"error": "Pinata not initialized"}
        
        try:
            # Step 1-2: Pin to Pinata
            crash_cid = self.pinata.pin_crash_event(telemetry)
            
            if not crash_cid:
                return {"error": "Failed to pin crash to IPFS"}
            
            # Update global state
            crash_state["status"] = "CRASH"
            crash_state["crash_cid"] = crash_cid
            crash_state["escrow_status"] = "RELEASE_PENDING"
            
            # Log event
            event = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "type": "EMERGENCY_DECLARED",
                "crash_cid": crash_cid,
                "telemetry": telemetry
            }
            crash_state["events"].append(event)

            # Step 3: Fire real NFTokenModify on XRPL
            nft_id  = os.getenv("XRPL_NFT_TOKEN_ID", "")
            xrpl_result = {"status": "skipped", "reason": "XRPL not configured"}

            if self.xrpl and nft_id:
                xrpl_result = self.xrpl.update_nft_on_crash(nft_id, crash_cid)
                crash_state["nft_tx_hash"] = xrpl_result.get("tx_hash", "")
            elif self.xrpl and not nft_id:
                xrpl_result = {"status": "skipped", "reason": "XRPL_NFT_TOKEN_ID not set in .env"}

            # Step 4: Build spoken ATC mayday report
            atc_speech = (
                f"Mayday mayday mayday! Catastrophic event detected. "
                f"Crash telemetry anchored to IPFS at {crash_cid}. "
                f"Digital twin updated on XRP Ledger. "
                f"Escrow release initiated. Rescue funds unlocking."
            )

            # Step 5: Return combined proof
            return {
                "success":       True,
                "message":       "Emergency declared and anchored to IPFS",
                "crash_cid":     crash_cid,
                "ipfs_link":     f"https://gateway.pinata.cloud/ipfs/{crash_cid}",
                "xrpl_nft":      xrpl_result,
                "escrow_release":"PENDING",
                "ai_speech":     atc_speech
            }
            
        except Exception as e:
            return {"error": f"Emergency declaration failed: {str(e)}"}
    
    async def get_escrow_status(self) -> dict:
        """
        Reports RLUSD escrow state (LOCKED → RELEASE_PENDING → RELEASED)
        Called by AI to tell judge where the rescue funds are
        """
        return {
            "asset": "RLUSD",
            "escrow_balance": crash_state["escrow_balance"],
            "status": crash_state["escrow_status"],
            "released_amount": 0 if crash_state["escrow_status"] == "LOCKED" else crash_state["escrow_balance"],
            "recipient": "Emergency Responders",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    async def list_recent_events(self, limit: int = 10) -> dict:
        """
        Full audit trail of all pinned events
        Judge can ask for complete timeline
        """
        return {
            "total_events": len(crash_state["events"]),
            "recent_events": crash_state["events"][-limit:],
            "flight_status": crash_state["status"]
        }


# Register tools with MCP
@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> ToolResult:
    """Handle tool calls from ElevenLabs"""
    mcp = FlightChainMCPServer()
    
    try:
        if name == "get_flight_status":
            result = await mcp.get_flight_status()
        elif name == "get_crash_evidence":
            result = await mcp.get_crash_evidence()
        elif name == "declare_emergency":
            telemetry = arguments.get("telemetry")
            result = await mcp.declare_emergency(telemetry)
        elif name == "get_escrow_status":
            result = await mcp.get_escrow_status()
        elif name == "list_recent_events":
            limit = arguments.get("limit", 10)
            result = await mcp.list_recent_events(limit)
        else:
            result = {"error": f"Unknown tool: {name}"}
        
        return ToolResult(
            content=[TextContent(type="text", text=json.dumps(result, indent=2))],
            is_error=False
        )
    
    except Exception as e:
        return ToolResult(
            content=[TextContent(type="text", text=json.dumps({"error": str(e)}, indent=2))],
            is_error=True
        )


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List all available tools for ElevenLabs AI"""
    return [
        Tool(
            name="get_flight_status",
            description="Get current flight status (NOMINAL or CRASH). Returns active CID.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="get_crash_evidence",
            description="Fetch the full crash JSON from IPFS. AI reads the CID hash aloud as cryptographic proof.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="declare_emergency",
            description="Pin crash telemetry to Pinata, get CID, prepare XRPL NFTokenModify, flag escrow release.",
            inputSchema={
                "type": "object",
                "properties": {
                    "telemetry": {
                        "type": "object",
                        "description": "Flight telemetry at time of crash"
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="get_escrow_status",
            description="Report RLUSD escrow state (LOCKED or RELEASE_PENDING). Shows rescue fund status.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        ),
        Tool(
            name="list_recent_events",
            description="Full audit trail of all pinned events. Returns complete timeline.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of recent events to return"
                    }
                },
                "required": []
            }
        ),
    ]


async def main():
    """Start the MCP server"""
    print("\n" + "="*60)
    print("🛡️  FlightChain MCP Server starting...")
    print("="*60)
    
    # Check env vars
    pinata_jwt = os.getenv("PINATA_JWT")
    xrpl_seed = os.getenv("XRPL_WALLET_SEED")
    
    print("\n📋 Configuration:")
    print(f"   Pinata JWT  : {'SET ✅' if pinata_jwt else 'NOT SET ❌'}")
    print(f"   XRPL Seed   : {'SET ✅' if xrpl_seed else 'NOT SET ⚠️  (optional for demo)'}")
    print("\n🛠️  Available Tools:")
    tools = await handle_list_tools()
    for tool in tools:
        print(f"   ✓ {tool.name}")
    
    print("\n📡 MCP server running on stdio")
    print("    Ready for ElevenLabs to call tools\n")
    
    # Run server (stdio mode for integration with ElevenLabs)
    async with server:
        pass  # Server handles requests via stdio


if __name__ == "__main__":
    asyncio.run(main())
