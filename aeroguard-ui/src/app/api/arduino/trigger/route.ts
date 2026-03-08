import { NextResponse } from "next/server"

// ─────────────────────────────────────────────────────────────
// ARDUINO CRASH TRIGGER ENDPOINT
//
// Your Python gateway should POST here when the Arduino IMU
// detects a G-force anomaly above the threshold.
//
//   POST /api/arduino/trigger
//   Body: { "gForce": 4.2 }
//
// The emergency page polls GET to check for triggers.
//
//   GET /api/arduino/trigger
//   Response: { "triggered": true, "gForce": 4.2, "timestamp": "..." }
//
// After a GET reads the trigger, it is cleared so the next
// simulation starts fresh.
// ─────────────────────────────────────────────────────────────

interface TriggerState {
  triggered: boolean
  gForce: number
  timestamp: string
}

// In-memory store — fine for a demo running on a single server
let triggerState: TriggerState = {
  triggered: false,
  gForce: 0,
  timestamp: "",
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const gForce = typeof body.gForce === "number" ? body.gForce : 4.0

    triggerState = {
      triggered: true,
      gForce,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({ ok: true, message: "Crash trigger received", gForce })
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body" }, { status: 400 })
  }
}

export async function GET() {
  const state = { ...triggerState }

  // Clear after read so the page doesn't re-trigger on next poll
  if (triggerState.triggered) {
    triggerState = { triggered: false, gForce: 0, timestamp: "" }
  }

  return NextResponse.json(state)
}
