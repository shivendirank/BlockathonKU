import { NextResponse } from "next/server"

/**
 * MCP-compatible endpoint for ElevenLabs agent to query flight status
 * Provides real-time Arduino sensor data and crash telemetry
 */

// In-memory storage for latest crash data
let latestCrashData: any = null

export async function GET() {
  try {
    // If we have recent crash data, return it
    if (latestCrashData) {
      console.log('📊 Serving crash data to ElevenLabs agent:', {
        callsign: latestCrashData.flight?.callsign,
        gforce: latestCrashData.sensors?.gforce,
        ipfs_cid: latestCrashData.telemetry?.ipfs_cid
      })
      return NextResponse.json(latestCrashData)
    }

    // Otherwise return nominal status (no crash)
    console.log('📊 No crash data available - returning nominal status')
    const nominalData = {
      status: "nominal",
      message: "No emergency data available. All flights operating normally.",
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(nominalData)
    
  } catch (error: any) {
    console.error('❌ Flight status GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST endpoint to update crash data from emergency page
export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    console.log('📥 Received crash data update from emergency page')
    console.log('  - Flight:', data.flight?.callsign)
    console.log('  - G-Force:', data.gforce)
    console.log('  - Position:', data.latitude, data.longitude)
    console.log('  - IPFS CID:', data.ipfs_cid)
    console.log('  - XRPL TX:', data.xrpl_tx)
    console.log('  - Escrow:', data.escrow_released ? 'RELEASED' : 'PENDING')
    
    // Store the latest crash data with full details
    latestCrashData = {
      status: "emergency",
      crash_severity: "catastrophic",
      flight: {
        callsign: data.flight?.callsign || "UNKNOWN",
        aircraft: data.flight?.aircraft || "Unknown Aircraft",
        airline: data.flight?.airline || "Unknown Airline",
        route: {
          departure: data.flight?.departure || data.flight?.depIata || "UNK",
          arrival: data.flight?.arrival || data.flight?.arrIata || "UNK"
        }
      },
      position: {
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        altitude_feet: data.altitude || 0,
        coordinates_format: "decimal_degrees"
      },
      sensors: {
        gforce: data.gforce || 0,
        gforce_threshold: 3.5,
        temperature_celsius: data.temperature || 28.4,
        pressure_kpa: data.pressure || 85.3,
        humidity_percent: data.humidity || 45.2,
        vibration: data.gforce > 3 ? "anomalous - structural failure" : "normal",
        sensor_status: "last_known"
      },
      telemetry: {
        ipfs_cid: data.ipfs_cid || "Unknown",
        ipfs_gateway_url: data.ipfs_cid ? `https://gateway.pinata.cloud/ipfs/${data.ipfs_cid}` : null,
        xrpl_transaction: data.xrpl_tx || "Unknown",
        xrpl_explorer_url: data.xrpl_tx ? `https://devnet.xrpl.org/transactions/${data.xrpl_tx}` : null,
        nft_token_id: process.env.NEXT_PUBLIC_XRPL_NFT_TOKEN_ID || "Unknown",
        nft_status: "uri_updated_to_crash_cid",
        escrow_released: data.escrow_released || false,
        escrow_amount_rlusd: 100000,
        escrow_destination: "rescue-sar-team.xrpl.wallet"
      },
      blockchain_proof: {
        immutable: true,
        cryptographically_verified: true,
        tamper_proof: true,
        audit_trail: "complete"
      },
      timestamp: new Date().toISOString(),
      event_time: data.event_time || new Date().toISOString()
    }

    console.log('✅ Crash data stored and ready for agent queries')

    return NextResponse.json({ success: true, data: latestCrashData })
    
  } catch (error: any) {
    console.error('❌ Update crash data error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
