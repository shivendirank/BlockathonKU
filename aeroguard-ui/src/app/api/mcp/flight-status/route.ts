import { NextResponse } from "next/server"

/**
 * MCP-compatible endpoint for ElevenLabs agent to query flight status
 * Provides real-time Arduino sensor data
 */

// In-memory storage for latest crash data
let latestCrashData: any = null

export async function GET() {
  try {
    // If we have recent crash data, return it
    if (latestCrashData) {
      return NextResponse.json(latestCrashData)
    }

    // Otherwise return mock sensor data
    const mockData = {
      status: "emergency",
      flight: {
        callsign: "QR4714",
        aircraft: "Boeing 777-300ER",
        route: {
          departure: "DOH",
          arrival: "JFK"
        }
      },
      position: {
        latitude: 40.8204,
        longitude: -0.0448,
        altitude_feet: 40068
      },
      sensors: {
        gforce: 4.2,
        temperature_celsius: 28.4,
        pressure_kpa: 85.3,
        humidity_percent: 45.2,
        vibration: "anomalous"
      },
      telemetry: {
        ipfs_cid: "QmCrash7x8k2j4m9n1p5q6r",
        xrpl_transaction: "F4A2C9E1B3D7",
        escrow_released: true,
        escrow_amount_rlusd: 100000
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(mockData)
    
  } catch (error: any) {
    console.error('Flight status error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST endpoint to update crash data from Arduino
export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Store the latest crash data
    latestCrashData = {
      status: "emergency",
      flight: data.flight || { callsign: "UNKNOWN" },
      position: {
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        altitude_feet: data.altitude || 0
      },
      sensors: {
        gforce: data.gforce || 0,
        temperature_celsius: data.temperature || 0,
        pressure_kpa: data.pressure || 0,
        humidity_percent: data.humidity || 0,
        vibration: data.gforce > 3 ? "anomalous" : "normal"
      },
      telemetry: {
        ipfs_cid: data.ipfs_cid || "Unknown",
        xrpl_transaction: data.xrpl_tx || "Unknown",
        escrow_released: data.escrow_released || false,
        escrow_amount_rlusd: 100000
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({ success: true, data: latestCrashData })
    
  } catch (error: any) {
    console.error('Update crash data error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
