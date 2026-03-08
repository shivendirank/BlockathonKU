import { NextResponse } from "next/server"

// Live telemetry endpoint - shows current Arduino readings
interface TelemetryState {
  gForce: number
  temp: number
  humidity: number
  lastUpdate: string
}

let currentTelemetry: TelemetryState = {
  gForce: 0,
  temp: 0,
  humidity: 0,
  lastUpdate: "",
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    currentTelemetry = {
      gForce: parseFloat(body.g || body.gForce || 0),
      temp: parseFloat(body.temp || body.temperature || 0),
      humidity: parseFloat(body.hum || body.humidity || 0),
      lastUpdate: new Date().toISOString(),
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json(currentTelemetry)
}
