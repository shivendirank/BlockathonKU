"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Search, X, Activity, AlertTriangle } from "lucide-react"
import RotatingEarth, { FLIGHT_ROUTES } from "@/components/ui/wireframe-dotted-globe"

interface FlightDetail {
  callsign: string
  route: string
  aircraft: string
  status: "nominal" | "warning"
  altitude: number
  speed: number
  gForce: number
  heading: number
  fuel: number
  extTemp: number
  nftId: string
  pinataCid: string
}

const FLIGHT_DB: FlightDetail[] = [
  { callsign: "AA 2847", route: "JFK → LHR", aircraft: "Boeing 777-300ER", status: "nominal", altitude: 38000, speed: 547, gForce: 1.02, heading: 47, fuel: 78, extTemp: -42, nftId: "0x7a3f...c91d", pinataCid: "QmT7fZ8n2Kxg3V...r9wP5" },
  { callsign: "JL 061", route: "NRT → LAX", aircraft: "Boeing 787-9", status: "nominal", altitude: 41000, speed: 512, gForce: 0.98, heading: 72, fuel: 64, extTemp: -56, nftId: "0x1b2e...a47f", pinataCid: "QmR3aB7kLm9xP...v2nQ" },
  { callsign: "SQ 321", route: "SIN → DXB", aircraft: "Airbus A380-800", status: "warning", altitude: 35200, speed: 489, gForce: 1.84, heading: 310, fuel: 52, extTemp: -38, nftId: "0x9d4c...f2e8", pinataCid: "QmX4cD6nHp2yT...w8mR" },
  { callsign: "LA 8070", route: "GIG → CDG", aircraft: "Boeing 787-8", status: "nominal", altitude: 39500, speed: 531, gForce: 1.01, heading: 28, fuel: 61, extTemp: -48, nftId: "0x3e7a...b15c", pinataCid: "QmY5dE8pJq4zW...x3kS" },
  { callsign: "QF 1", route: "SYD → HKG", aircraft: "Airbus A330-300", status: "nominal", altitude: 37000, speed: 498, gForce: 1.00, heading: 335, fuel: 71, extTemp: -44, nftId: "0x5f8d...e3a7", pinataCid: "QmZ6fG9rKs5aX...y4lT" },
  { callsign: "AM 001", route: "MEX → MAD", aircraft: "Boeing 787-9", status: "nominal", altitude: 40200, speed: 519, gForce: 0.99, heading: 62, fuel: 58, extTemp: -52, nftId: "0x2c6b...d9f4", pinataCid: "QmA7gH1sLt6bY...z5mU" },
  { callsign: "SU 270", route: "SVO → BKK", aircraft: "Airbus A350-900", status: "nominal", altitude: 39800, speed: 508, gForce: 1.01, heading: 118, fuel: 66, extTemp: -50, nftId: "0x8e5a...d3b2", pinataCid: "QmB8hI2tMu7cZ...a6nV" },
  { callsign: "TK 5", route: "IST → ORD", aircraft: "Boeing 777-300ER", status: "nominal", altitude: 38500, speed: 536, gForce: 1.00, heading: 298, fuel: 73, extTemp: -46, nftId: "0x4f9c...e6a1", pinataCid: "QmC9iJ3uNv8dA...b7oW" },
  { callsign: "AI 118", route: "DEL → PVG", aircraft: "Boeing 787-8", status: "nominal", altitude: 40500, speed: 502, gForce: 0.99, heading: 82, fuel: 69, extTemp: -54, nftId: "0x6d2b...f7c5", pinataCid: "QmD1jK4vOw9eB...c8pX" },
  { callsign: "AC 890", route: "YYZ → FCO", aircraft: "Airbus A330-300", status: "nominal", altitude: 37800, speed: 525, gForce: 1.01, heading: 55, fuel: 62, extTemp: -43, nftId: "0xa1e3...g8d6", pinataCid: "QmE2kL5wPx1fC...d9qY" },
]

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [liveData, setLiveData] = useState<Record<number, FlightDetail>>({})

  useEffect(() => {
    setMounted(true)
    const flightParam = searchParams.get("flight")
    if (flightParam !== null) {
      const idx = parseInt(flightParam, 10)
      if (!isNaN(idx) && idx >= 0 && idx < FLIGHT_DB.length) {
        setSelectedIndex(idx)
      }
    }
  }, [searchParams])

  // Simulate live telemetry jitter
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData((prev) => {
        const next = { ...prev }
        FLIGHT_DB.forEach((base, i) => {
          const existing = next[i] || { ...base }
          next[i] = {
            ...existing,
            altitude: existing.altitude + (Math.random() - 0.5) * 80,
            speed: existing.speed + (Math.random() - 0.5) * 4,
            gForce: Math.max(0.85, Math.min(1.6, existing.gForce + (Math.random() - 0.5) * 0.03)),
            heading: (existing.heading + (Math.random() - 0.5) * 0.8 + 360) % 360,
            fuel: Math.max(0, existing.fuel - 0.002),
            extTemp: existing.extTemp + (Math.random() - 0.5) * 0.4,
          }
        })
        return next
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return FLIGHT_DB.map((f, i) => ({ ...f, index: i })).filter(
      (f) =>
        f.callsign.toLowerCase().includes(q) ||
        f.route.toLowerCase().includes(q) ||
        f.aircraft.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const selected = selectedIndex !== null ? (liveData[selectedIndex] || FLIGHT_DB[selectedIndex]) : null

  const handleFlightClick = (index: number) => {
    setSelectedIndex(index)
    setSearchOpen(false)
    setSearchQuery("")
  }

  const handleClose = () => {
    setSelectedIndex(null)
  }

  if (!mounted) return <div className="min-h-screen bg-black" />

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      {/* Full-screen globe */}
      <div className="absolute inset-0">
        <RotatingEarth
          width={window.innerWidth}
          height={window.innerHeight}
          showFlights={true}
          zoomLevel={1}
          highlightedFlight={selectedIndex}
          frozen={selectedIndex !== null}
          onFlightClick={handleFlightClick}
        />
      </div>

      {/* Search bar — top center */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
        <div className="relative">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border backdrop-blur-md transition-all duration-300 ${
              searchOpen
                ? "bg-black/80 border-white/20"
                : "bg-black/40 border-white/10 hover:border-white/20"
            }`}
          >
            <Search className="w-4 h-4 text-white/40 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search flights..."
              className="bg-transparent text-sm text-white placeholder-white/30 outline-none w-full font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchOpen(false) }}
                className="text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full rounded-xl border border-white/10 bg-black/90 backdrop-blur-md overflow-hidden">
              {searchResults.map((result) => (
                <button
                  key={result.index}
                  onClick={() => handleFlightClick(result.index)}
                  className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-white">{result.callsign}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      result.status === "warning"
                        ? "text-amber-400 bg-amber-400/10"
                        : "text-white/50 bg-white/5"
                    }`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-white/40">{result.route}</span>
                    <span className="text-xs font-mono text-white/25">{result.aircraft}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchOpen && searchQuery && searchResults.length === 0 && (
            <div className="absolute top-full mt-2 w-full rounded-xl border border-white/10 bg-black/90 backdrop-blur-md p-4">
              <span className="text-xs font-mono text-white/30">No flights found</span>
            </div>
          )}
        </div>
      </div>

      {/* Flight detail panel — slides in from right */}
      <div
        className={`fixed top-0 right-0 h-full w-96 z-30 transition-transform duration-500 ease-out ${
          selected ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full bg-black/80 backdrop-blur-xl border-l border-white/10 flex flex-col">
          {selected && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-mono font-bold text-white">{selected.callsign}</h2>
                  <p className="text-xs font-mono text-white/40 mt-0.5">{selected.route}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Status + Aircraft */}
              <div className="px-5 py-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white/40">AIRCRAFT</span>
                  <span className="text-xs font-mono text-white/70">{selected.aircraft}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs font-mono text-white/40">STATUS</span>
                  <span className={`text-xs font-mono font-semibold ${
                    selected.status === "warning" ? "text-amber-400" : "text-white/70"
                  }`}>
                    {selected.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Live telemetry */}
              <div className="px-5 py-4 flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-3.5 h-3.5 text-white/50" />
                  <span className="text-[10px] font-mono tracking-[0.15em] text-white/50">LIVE TELEMETRY</span>
                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse ml-auto" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <TelemetryCell label="ALTITUDE" value={`${Math.round(selected.altitude).toLocaleString()} ft`} />
                  <TelemetryCell label="SPEED" value={`${Math.round(selected.speed)} kts`} />
                  <TelemetryCell
                    label="G-FORCE"
                    value={`${selected.gForce.toFixed(2)}G`}
                    warn={selected.gForce > 1.3}
                  />
                  <TelemetryCell label="HEADING" value={`${Math.round(selected.heading)}°`} />
                  <TelemetryCell label="FUEL" value={`${selected.fuel.toFixed(1)}%`} />
                  <TelemetryCell label="EXT TEMP" value={`${Math.round(selected.extTemp)}°C`} />
                </div>

                {/* dNFT */}
                <div className="mt-6">
                  <span className="text-[10px] font-mono tracking-[0.15em] text-white/30 block mb-2">XRPL DYNAMIC NFT</span>
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 space-y-2">
                    <Row label="TOKEN ID" value={selected.nftId} />
                    <Row label="STATUS URI" value="ipfs://...nominal" />
                    <Row label="DOMAIN" value="airline.permitted" />
                  </div>
                </div>

                {/* Pinata */}
                <div className="mt-4">
                  <span className="text-[10px] font-mono tracking-[0.15em] text-white/30 block mb-2">PINATA IPFS</span>
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <span className="text-[10px] font-mono text-white/40 break-all">CID: {selected.pinataCid}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Click a flight hint — shown when nothing is selected */}
      {!selected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <span className="text-[11px] font-mono text-white/20 tracking-wider">
            CLICK A FLIGHT TO VIEW DETAILS
          </span>
        </div>
      )}
    </div>
  )
}

function TelemetryCell({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${
      warn ? "border-amber-500/20 bg-amber-500/[0.04]" : "border-white/8 bg-white/[0.02]"
    }`}>
      <span className="text-[9px] font-mono text-white/30 block mb-1">{label}</span>
      <span className={`text-sm font-mono font-semibold ${warn ? "text-amber-400" : "text-white"}`}>
        {value}
      </span>
      {warn && <AlertTriangle className="w-3 h-3 text-amber-400 mt-1" />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono text-white/30">{label}</span>
      <span className="text-[10px] font-mono text-white/60">{value}</span>
    </div>
  )
}
