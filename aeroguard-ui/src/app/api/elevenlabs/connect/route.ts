import { NextResponse } from "next/server"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID

/**
 * Get WebSocket signed URL for ElevenLabs Conversational AI
 * Agent configuration is done on ElevenLabs dashboard
 * System prompt with flight context should be configured there
 */
export async function POST(request: Request) {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return NextResponse.json({
      mock: true,
      reason: "ElevenLabs credentials missing",
      message: "Running in mock voice mode. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID to enable live voice."
    })
  }

  try {
    // Get flight context from request body for logging
    const body = await request.json().catch(() => ({}))
    const flightContext = body.flightContext || {}
    
    console.log('📊 Flight Context for Voice Agent:')
    console.log('  - Callsign:', flightContext.callsign)
    console.log('  - G-Force:', flightContext.gforce)
    console.log('  - Position:', flightContext.latitude, flightContext.longitude)
    console.log('  - IPFS CID:', flightContext.ipfs_cid)
    console.log('  - XRPL Status:', flightContext.xrpl_status)

    // Get signed WebSocket URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        }
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs connection error:', response.status, errorText)
      
      if (response.status === 401) {
        return NextResponse.json(
          {
            mock: true,
            reason: "ElevenLabs API key missing required permission",
            message: "Running in mock voice mode. Create an ElevenLabs key with ElevenAgents Write permission to enable live voice."
          }
        )
      }
      
      return NextResponse.json({
        mock: true,
        reason: `ElevenLabs API error: ${response.status}`,
        message: "Running in mock voice mode due to upstream ElevenLabs API failure."
      })
    }

    const data = await response.json()
    console.log('✅ Got signed WebSocket URL for agent:', ELEVENLABS_AGENT_ID)
    
    // Return signed URL - configuration is set on ElevenLabs dashboard
    return NextResponse.json({ 
      signed_url: data.signed_url,
      agent_id: ELEVENLABS_AGENT_ID
    })
    
  } catch (error: any) {
    console.error('Connection error:', error)
    return NextResponse.json({
      mock: true,
      reason: error.message,
      message: "Running in mock voice mode due to connection error."
    })
  }
}
