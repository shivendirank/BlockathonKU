import { NextResponse } from "next/server"

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID
// Young Jamal voice (from your agent config)
const VOICE_ID = "Zlb1dXrM653N07WRdFW3"

export async function POST(request: Request) {
  if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID) {
    return NextResponse.json({ 
      error: "ElevenLabs not configured",
      agentResponse: "Voice system unavailable. Configure ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in .env.local",
      success: false 
    }, { status: 200 })
  }

  try {
    const { message, flightData } = await request.json()
    
    // Build context message with flight data
    const contextMessage = `Emergency situation: Flight ${flightData.callsign}, aircraft ${flightData.aircraft}, route ${flightData.depIata} to ${flightData.arrIata}. Position: ${flightData.currentPos[1].toFixed(4)}N, ${flightData.currentPos[0].toFixed(4)}E. Altitude: ${flightData.altitude}ft. G-force: ${flightData.gForce}G. Temperature: ${flightData.temp}C. Radio Tower asks: "${message}"`
    
    console.log('ElevenLabs request:', {
      agent_id: ELEVENLABS_AGENT_ID,
      message: contextMessage
    })

    // Try to get signed URL for conversational AI (requires convai_write permission)
    try {
      const signedUrlResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${ELEVENLABS_AGENT_ID}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          }
        }
      )

      if (signedUrlResponse.ok) {
        const { signed_url } = await signedUrlResponse.json()
        console.log('✓ Got signed URL - Agent ready for WebSocket connection')
        // TODO: Implement WebSocket client for full conversational AI
        // For now, fall through to TTS with generated response
      } else {
        console.log('✗ No convai_write permission - using TTS fallback')
      }
    } catch (e) {
      console.log('Agent access failed, using TTS fallback')
    }
    
    // Generate contextual response based on your agent's system prompt
    const responseText = generateEmergencyResponse(message, flightData)
    
    // Generate audio using Text-to-Speech with Young Jamal voice
    console.log('Generating speech with Young Jamal voice:', responseText.substring(0, 50) + '...')
    
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: responseText,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    })

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text()
      console.error('TTS error:', ttsResponse.status, errorText)
      throw new Error(`TTS failed: ${ttsResponse.status}`)
    }

    // Convert audio to base64 data URL
    const audioBuffer = await ttsResponse.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`
    
    console.log('✓ Audio generated successfully')
    
    return NextResponse.json({ 
      success: true, 
      agentResponse: responseText,
      audioUrl: audioUrl,
      note: "Using TTS fallback. Create API key with 'ElevenAgents Write' for full agent capabilities."
    })
    
  } catch (error: any) {
    console.error('ElevenLabs error:', error)
    
    return NextResponse.json({ 
      success: false,
      error: error.message,
      agentResponse: `System error: ${error.message}. Create new API key with "ElevenAgents Write" permission.`,
    }, { status: 200 })
  }
}

// Generate contextual emergency response
function generateEmergencyResponse(message: string, flightData: any): string {
  const msg = message.toLowerCase()
  
  // Contextual responses based on message
  if (msg.includes('status') || msg.includes('update')) {
    return `Copy that, tower. Flight ${flightData.callsign} emergency status: Aircraft ${flightData.aircraft} experienced ${flightData.gForce}G impact at position ${flightData.currentPos[1].toFixed(2)} degrees north, ${flightData.currentPos[0].toFixed(2)} degrees east. Altitude at impact: ${flightData.altitude} feet. Telemetry has been anchored to IPFS. Dynamic NFT updated on XRPL. Emergency funds released. Awaiting search and rescue coordination.`
  }
  
  if (msg.includes('position') || msg.includes('location') || msg.includes('where')) {
    return `Roger, tower. Last known position: ${flightData.currentPos[1].toFixed(4)} degrees north, ${flightData.currentPos[0].toFixed(4)} degrees east. Altitude: ${flightData.altitude} feet. Route was ${flightData.depIata} to ${flightData.arrIata}.`
  }
  
  if (msg.includes('crew') || msg.includes('passenger') || msg.includes('people')) {
    return `Tower, aircraft ${flightData.aircraft} typical capacity data available in flight manifest. Emergency locator beacon activated. Coordinating with search and rescue teams.`
  }
  
  if (msg.includes('weather') || msg.includes('conditions')) {
    return `Roger. Temperature at last reading: ${flightData.temp} degrees Celsius. Weather conditions being assessed by rescue coordination center.`
  }
  
  // Default acknowledgment with context
  return `Copy that, tower. ${message}. AeroGuard system has secured all telemetry data. Flight ${flightData.callsign} black box data backed up to IPFS with CID verification. XRPL escrow has released one hundred thousand RLUSD to search and rescue wallet. Standing by for further instructions.`
}
