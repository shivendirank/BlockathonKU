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

  // Keep trigger active for 10 seconds so frontend has time to catch it
  // Frontend will clear it by reading, or it auto-expires
  if (triggerState.triggered && triggerState.timestamp) {
    const triggerTime = new Date(triggerState.timestamp).getTime()
    const now = new Date().getTime()
    const elapsed = now - triggerTime
    
    // Auto-clear after 10 seconds OR if already read once (frontend handles clear)
    if (elapsed > 10000) {
      triggerState = { triggered: false, gForce: 0, timestamp: "" }
    }
  }

  return NextResponse.json(state)
}

// Manual reset endpoint
export async function DELETE() {
  triggerState = { triggered: false, gForce: 0, timestamp: "" }
  return NextResponse.json({ ok: true, message: "Trigger cleared" })
}
