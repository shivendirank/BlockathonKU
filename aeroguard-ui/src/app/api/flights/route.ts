import { NextResponse } from "next/server"
import { getAirportCoords, estimateFlightProgress } from "@/lib/airports"
import type { LiveFlight } from "@/lib/types"

const API_KEY = process.env.AVIATIONSTACK_API_KEY

type Region = "north_america" | "south_america" | "europe" | "middle_east" | "asia" | "oceania" | "africa"

function classifyRegion(coords: [number, number]): Region {
  const [lng, lat] = coords
  if (lat > 10 && lng >= -140 && lng <= -50) return "north_america"
  if (lat <= 10 && lng >= -90 && lng <= -30) return "south_america"
  if (lat > 35 && lng >= -12 && lng <= 40) return "europe"
  if (lat >= 10 && lat <= 40 && lng > 30 && lng <= 60) return "middle_east"
  if (lat > -12 && lng > 60 && lng <= 180) return "asia"
  if (lat <= -12 && lng > 100) return "oceania"
  return "africa"
}

// Supplemental realistic flights for regions underrepresented by the API at any
// given time of day.  These use real airline names and plausible routes.
const SUPPLEMENTAL: Record<Region, LiveFlight[]> = {
  north_america: [
    makeSuppFlight("AA 2847", "American Airlines", "JFK", "LAX", "Boeing 777-300ER", 0.55),
    makeSuppFlight("UA 354",  "United Airlines",   "ORD", "SFO", "Boeing 737 MAX 9", 0.38),
    makeSuppFlight("DL 1092", "Delta Air Lines",    "ATL", "MIA", "Airbus A321neo",   0.62),
  ],
  south_america: [
    makeSuppFlight("LA 8070", "LATAM Airlines", "GRU", "SCL", "Boeing 787-9",  0.48),
    makeSuppFlight("AV 19",   "Avianca",        "BOG", "LIM", "Airbus A320",   0.35),
  ],
  europe: [
    makeSuppFlight("BA 178",  "British Airways",  "LHR", "FRA", "Airbus A320neo",    0.52),
    makeSuppFlight("AF 1680", "Air France",        "CDG", "BCN", "Airbus A319",       0.45),
    makeSuppFlight("LH 400",  "Lufthansa",         "FRA", "JFK", "Airbus A340-600",   0.30),
  ],
  middle_east: [
    makeSuppFlight("EK 215",  "Emirates",         "DXB", "LHR", "Airbus A380-800", 0.42),
    makeSuppFlight("QR 741",  "Qatar Airways",     "DOH", "SIN", "Boeing 777-300ER", 0.58),
  ],
  asia: [],
  oceania: [
    makeSuppFlight("QF 1",    "Qantas",     "SYD", "SIN", "Airbus A380-800",  0.50),
  ],
  africa: [
    makeSuppFlight("ET 302",  "Ethiopian Airlines", "ADD", "NBO", "Boeing 737-800", 0.60),
  ],
}

function makeSuppFlight(
  callsign: string, airline: string,
  depIata: string, arrIata: string,
  aircraft: string, progress: number
): LiveFlight {
  const depCoords = getAirportCoords(depIata)!
  const arrCoords = getAirportCoords(arrIata)!
  const currentPos: [number, number] = [
    depCoords[0] + (arrCoords[0] - depCoords[0]) * progress,
    depCoords[1] + (arrCoords[1] - depCoords[1]) * progress,
  ]
  const dx = arrCoords[0] - depCoords[0]
  const dy = arrCoords[1] - depCoords[1]
  return {
    callsign, flightIata: callsign.replace(" ", ""), airline,
    depIata, depAirport: depIata, arrIata, arrAirport: arrIata,
    aircraft, status: "active", depCoords, arrCoords, currentPos, progress,
    altitude: 34000 + Math.round(Math.random() * 7000),
    speed: 440 + Math.round(Math.random() * 80),
    direction: Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360),
    hasLiveGps: false,
  }
}

function processApiFlight(f: Record<string, any>): LiveFlight | null {
  const depIata = f.departure?.iata
  const arrIata = f.arrival?.iata
  if (!depIata || !arrIata || depIata === arrIata) return null

  const depCoords = getAirportCoords(depIata)
  const arrCoords = getAirportCoords(arrIata)
  if (!depCoords || !arrCoords) return null

  const hasLiveGps = !!(f.live?.latitude && f.live?.longitude)
  let currentPos: [number, number]
  let altitude: number, speed: number, direction: number, progress: number

  if (hasLiveGps) {
    currentPos = [f.live.longitude, f.live.latitude]
    altitude = Math.round((f.live.altitude || 0) * 3.28084)
    speed = Math.round((f.live.speed_horizontal || 0) * 0.539957)
    direction = Math.round(f.live.direction || 0)
    const totalDist = Math.sqrt((arrCoords[0] - depCoords[0]) ** 2 + (arrCoords[1] - depCoords[1]) ** 2)
    const coveredDist = Math.sqrt((currentPos[0] - depCoords[0]) ** 2 + (currentPos[1] - depCoords[1]) ** 2)
    progress = totalDist > 0 ? Math.min(0.99, coveredDist / totalDist) : 0.5
  } else {
    progress = estimateFlightProgress(
      f.departure?.scheduled, f.arrival?.scheduled,
      f.departure?.actual || f.departure?.actual_runway
    )
    currentPos = [
      depCoords[0] + (arrCoords[0] - depCoords[0]) * progress,
      depCoords[1] + (arrCoords[1] - depCoords[1]) * progress,
    ]
    const cruising = progress > 0.1 && progress < 0.9
    altitude = cruising ? 32000 + Math.round(Math.random() * 9000) : Math.round(15000 + Math.random() * 10000)
    speed = cruising ? 440 + Math.round(Math.random() * 80) : Math.round(250 + Math.random() * 100)
    const dx = arrCoords[0] - depCoords[0]
    const dy = arrCoords[1] - depCoords[1]
    direction = Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360)
  }

  const callsign = f.flight?.iata || `${f.airline?.iata || "??"}${f.flight?.number || "?"}`
  return {
    callsign, flightIata: f.flight?.iata || callsign,
    airline: f.airline?.name || "Unknown",
    depIata, depAirport: f.departure?.airport || depIata,
    arrIata, arrAirport: f.arrival?.airport || arrIata,
    aircraft: f.aircraft?.iata || "Unknown",
    status: f.flight_status || "active",
    depCoords, arrCoords, currentPos, progress,
    altitude, speed, direction, hasLiveGps,
  }
}

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 })
  }

  try {
    const res = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_status=active&limit=100`,
      { next: { revalidate: 120 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: "Aviationstack API error" }, { status: 502 })
    }

    const json = await res.json()
    if (json.error) {
      return NextResponse.json({ error: json.error.message }, { status: 502 })
    }

    // Bucket every valid API flight by region
    const usedRoutes = new Set<string>()
    const buckets: Record<Region, LiveFlight[]> = {
      north_america: [], south_america: [], europe: [],
      middle_east: [], asia: [], oceania: [], africa: [],
    }

    for (const f of json.data) {
      const flight = processApiFlight(f)
      if (!flight) continue
      const routeKey = [flight.depIata, flight.arrIata].sort().join("-")
      if (usedRoutes.has(routeKey)) continue
      usedRoutes.add(routeKey)

      const midLng = (flight.depCoords[0] + flight.arrCoords[0]) / 2
      const midLat = (flight.depCoords[1] + flight.arrCoords[1]) / 2
      const region = classifyRegion([midLng, midLat])
      buckets[region].push(flight)
    }

    // Target: ~12 flights, well-distributed across regions
    const TARGET = 12
    const regionOrder: Region[] = [
      "north_america", "europe", "asia", "middle_east",
      "south_america", "oceania", "africa",
    ]

    const picked: LiveFlight[] = []
    const pickedRoutes = new Set<string>()

    // Round 1: pick 1 real API flight per region that has one
    for (const region of regionOrder) {
      if (picked.length >= TARGET) break
      const candidate = buckets[region][0]
      if (candidate) {
        picked.push(candidate)
        pickedRoutes.add([candidate.depIata, candidate.arrIata].sort().join("-"))
      }
    }

    // Round 2: fill empty regions with supplemental flights
    for (const region of regionOrder) {
      if (picked.length >= TARGET) break
      const hasRealFromRegion = picked.some(
        (p) => classifyRegion([(p.depCoords[0] + p.arrCoords[0]) / 2, (p.depCoords[1] + p.arrCoords[1]) / 2]) === region
      )
      if (!hasRealFromRegion) {
        for (const supp of SUPPLEMENTAL[region]) {
          if (picked.length >= TARGET) break
          const rk = [supp.depIata, supp.arrIata].sort().join("-")
          if (!pickedRoutes.has(rk)) {
            picked.push(supp)
            pickedRoutes.add(rk)
            break
          }
        }
      }
    }

    // Round 3: fill remaining slots — prefer real API flights, then supplemental
    const allRemaining = regionOrder.flatMap((r) => buckets[r].slice(1))
    for (const flight of allRemaining) {
      if (picked.length >= TARGET) break
      const rk = [flight.depIata, flight.arrIata].sort().join("-")
      if (!pickedRoutes.has(rk)) {
        picked.push(flight)
        pickedRoutes.add(rk)
      }
    }

    // Still room? Add more supplemental for variety
    for (const region of regionOrder) {
      if (picked.length >= TARGET) break
      for (const supp of SUPPLEMENTAL[region]) {
        if (picked.length >= TARGET) break
        const rk = [supp.depIata, supp.arrIata].sort().join("-")
        if (!pickedRoutes.has(rk)) {
          picked.push(supp)
          pickedRoutes.add(rk)
        }
      }
    }

    return NextResponse.json({ flights: picked, fetchedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: "Failed to fetch flight data" }, { status: 500 })
  }
}
