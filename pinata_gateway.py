"""
FlightChain Pinata Gateway
Handles immutable telemetry anchoring to IPFS via Pinata
"""
import os
import json
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load credentials from .env file
load_dotenv()

PINATA_API_URL = "https://api.pinata.cloud"

class PinataGateway:
    def __init__(self, jwt_token=None):
        self.jwt = jwt_token or os.getenv("PINATA_JWT")
        if not self.jwt:
            raise ValueError("PINATA_JWT environment variable not set")
        
        self.headers = {
            "Authorization": f"Bearer {self.jwt}",
            "Content-Type": "application/json"
        }
    
    def test_authentication(self):
        """Verify Pinata JWT is valid"""
        try:
            response = requests.get(
                f"{PINATA_API_URL}/data/testAuthentication",
                headers=self.headers,
                timeout=10
            )
            if response.status_code == 200:
                print("✅ Pinata authentication successful!")
                return True
            else:
                print(f"❌ Auth failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Connection error: {e}")
            return False
    
    def pin_nominal_state(self):
        """
        Pin the safe pre-flight state to IPFS
        Returns CID for the initial NFT URI
        """
        nominal_data = {
            "status": "NOMINAL",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "flight_state": {
                "altitude": 35000,
                "airspeed": 450,
                "g_force": 1.0,
                "engines": "RUNNING",
                "cabin_pressure": "NORMAL"
            },
            "aircraft_id": "FlightChain-001",
            "FlightChain_version": "1.0"
        }
        
        return self._pin_json(
            nominal_data,
            name="FlightChain_nominal_flight"
        )
    
    def pin_crash_event(self, telemetry=None):
        """
        Pin crash telemetry to IPFS
        Called when Arduino detects G > 3.5
        Returns CID for NFTokenModify transaction
        """
        if telemetry is None:
            telemetry = {
                "altitude": 28500,
                "airspeed": 620,
                "g_force": 4.2,
                "engines": "FAILURE",
                "cabin_pressure": "COMPROMISED"
            }
        
        crash_data = {
            "status": "CRASH_DETECTED",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "crash_telemetry": telemetry,
            "aircraft_id": "FlightChain-001",
            "emergency_declared": True,
            "FlightChain_version": "1.0"
        }
        
        return self._pin_json(
            crash_data,
            name="FlightChain_crash_event"
        )
    
    def _pin_json(self, data, name="FlightChain_data"):
        """
        Internal method to pin JSON to IPFS
        """
        try:
            json_data = json.dumps(data)
            
            response = requests.post(
                f"{PINATA_API_URL}/pinning/pinJSONToIPFS",
                headers=self.headers,
                json={
                    "pinataContent": data,
                    "pinataMetadata": {
                        "name": name,
                        "keyvalues": {
                            "FlightChain": "true",
                            "status": data.get("status", "unknown")
                        }
                    }
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                cid = result["IpfsHash"]
                print(f"✅ Pinned to IPFS: {name}")
                print(f"   CID: {cid}")
                return cid
            else:
                print(f"❌ Pin failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Error pinning JSON: {e}")
            return None
    
    def get_pinned_json(self, cid):
        """
        Retrieve pinned JSON from IPFS via Pinata gateway
        Used by MCP server for ElevenLabs AI to read crash proof
        """
        try:
            # Use Pinata's JSON gateway
            gateway_url = f"https://gateway.pinata.cloud/ipfs/{cid}"
            
            response = requests.get(gateway_url, timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to retrieve CID {cid}: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error retrieving from IPFS: {e}")
            return None
    
    def list_recent_pins(self, limit=10):
        """
        List recent pinned files (audit trail)
        """
        try:
            response = requests.get(
                f"{PINATA_API_URL}/data/pinList?status=pinned",
                headers=self.headers,
                params={"limit": limit},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to list pins: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error listing pins: {e}")
            return None


def main():
    """Self-test for Pinata integration"""
    print("\n🛡️  FlightChain Pinata Gateway — Self Test\n")
    
    try:
        gateway = PinataGateway()
        
        # Test 1: Auth
        print("Test 1: Authentication")
        if not gateway.test_authentication():
            print("❌ Auth failed. Check your PINATA_JWT.")
            return
        
        # Test 2: Pin nominal state
        print("\nTest 2: Pinning Nominal State")
        nominal_cid = gateway.pin_nominal_state()
        if not nominal_cid:
            print("❌ Failed to pin nominal state")
            return
        
        # Test 3: Pin crash event
        print("\nTest 3: Pinning Crash Event")
        crash_cid = gateway.pin_crash_event()
        if not crash_cid:
            print("❌ Failed to pin crash event")
            return
        
        # Test 4: Retrieve data
        print("\nTest 4: Retrieving Crash Data from IPFS")
        crash_data = gateway.get_pinned_json(crash_cid)
        if crash_data:
            print(f"✅ Retrieved crash data:")
            print(f"   Status: {crash_data['status']}")
            print(f"   G-Force: {crash_data['crash_telemetry']['g_force']}")
            print(f"   Timestamp: {crash_data['timestamp']}")
        else:
            print("❌ Failed to retrieve crash data")
            return
        
        # Test 5: List recent pins
        print("\nTest 5: Listing Recent Pins")
        pins = gateway.list_recent_pins(limit=5)
        if pins:
            print(f"✅ Found {len(pins.get('rows', []))} recent pins")
        
        print("\n" + "="*50)
        print("✅ All tests passed! Pinata is ready.")
        print(f"   Nominal CID: {nominal_cid}")
        print(f"   Crash CID: {crash_cid}")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"❌ Self-test failed: {e}\n")


if __name__ == "__main__":
    main()
