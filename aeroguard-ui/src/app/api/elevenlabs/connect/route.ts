import { NextResponse } from "next/server"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID

/**
 * Get WebSocket signed URL for ElevenLabs Conversational AI
 * The agent has access to get_flight_status tool via MCP server
 */
export async function POST() {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return NextResponse.json(
      { error: "ElevenLabs credentials not configured in .env.local" },
      { status: 500 }
    )
  }

  try {
    // Get signed WebSocket URL for conversational AI
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
            error: "API key missing 'ElevenAgents Write' permission. Go to https://elevenlabs.io/app/settings/api-keys and create new key with ElevenAgents access enabled." 
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✓ Got signed WebSocket URL for agent:', ELEVENLABS_AGENT_ID)
    
    return NextResponse.json({ 
      signed_url: data.signed_url,
      agent_id: ELEVENLABS_AGENT_ID 
    })
    
  } catch (error: any) {
    console.error('Connection error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
