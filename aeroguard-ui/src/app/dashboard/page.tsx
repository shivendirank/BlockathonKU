"use client"

import { useState, useEffect, useMemo, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Search, X, Activity, Wifi, WifiOff, Lock, Zap, ChevronDown, ChevronUp,
} from "lucide-react"
import RotatingEarth from "@/components/ui/wireframe-dotted-globe"
import type { FlightRouteInfo } from "@/components/ui/wireframe-dotted-globe"
import type { LiveFlight } from "@/lib/types"

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [flights, setFlights] = useState<LiveFlight[]>([])
  const [isLive, setIsLive] = useState(false)
  const [lastFetch, setLastFetch] = useState("")
  const [ipfsExpanded, setIpfsExpanded] = useState(false)

  const [jitter, setJitter] = useState<Record<number, { alt: number; spd: number; dir: number }>>({})

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights")
      if (!res.ok) throw new Error("API error")
      const data = await res.json()
      if (data.flights?.length) {
        setFlights(data.flights)
        setIsLive(true)
        setLastFetch(new Date().toLocaleTimeString("en-US", { hour12: false }))
      }
    } catch {
      setIsLive(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchFlights()
    const interval = setInterval(fetchFlights, 60000)
    return () => clearInterval(interval)
  }, [fetchFlights])

  useEffect(() => {
    const flightParam = searchParams.get("flight")
    if (flightParam !== null) {
      const idx = parseInt(flightParam, 10)
      if (!isNaN(idx) && idx >= 0 && idx < flights.length) {
        setSelectedIndex(idx)
      }
    }
  }, [searchParams, flights.length])

  useEffect(() => {
    const interval = setInterval(() => {
      setJitter((prev) => {
        const next: Record<number, { alt: number; spd: number; dir: number }> = {}
        flights.forEach((_, i) => {
          const p = prev[i] || { alt: 0, spd: 0, dir: 0 }
          next[i] = {
            alt: p.alt + (Math.random() - 0.5) * 60,
            spd: p.spd + (Math.random() - 0.5) * 3,
            dir: p.dir + (Math.random() - 0.5) * 0.5,
          }
        })
        return next
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [flights])

  const globeFlights: FlightRouteInfo[] = useMemo(() => {
    return flights.map((f) => ({
      from: f.depCoords,
      to: f.arrCoords,
      label: `${f.callsign} (${f.depIata} → ${f.arrIata})`,
      initialProgress: f.progress,
    }))
  }, [flights])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return flights
      .map((f, i) => ({ ...f, index: i }))
      .filter(
        (f) =>
          f.callsign.toLowerCase().includes(q) ||
          f.airline.toLowerCase().includes(q) ||
          f.depIata.toLowerCase().includes(q) ||
          f.arrIata.toLowerCase().includes(q) ||
          f.depAirport.toLowerCase().includes(q) ||
          f.arrAirport.toLowerCase().includes(q)
      )
  }, [searchQuery, flights])

  const selected = selectedIndex !== null ? flights[selectedIndex] : null
  const j = selectedIndex !== null ? jitter[selectedIndex] : null

  const handleFlightClick = (index: number) => {
    setSelectedIndex(index)
    setSearchOpen(false)
    setSearchQuery("")
    setIpfsExpanded(false)
  }

  const handleClose = () => {
    setSelectedIndex(null)
    setIpfsExpanded(false)
  }

  if (!mounted) return <div className="min-h-screen bg-black" />

  const displayAlt = selected ? Math.max(0, Math.round(selected.altitude + (j?.alt || 0))) : 0
  const displaySpd = selected ? Math.max(0, Math.round(selected.speed + (j?.spd || 0))) : 0
  const displayHdg = selected ? Math.round(((selected.direction + (j?.dir || 0)) + 360) % 360) : 0
  const nominalCid = selected ? `Qm${selected.callsign.replace(/\s/g, "")}Nominal...safe` : ""
  const nftTokenId = selected ? `0x${selected.callsign.replace(/\s/g, "").toLowerCase()}...nft` : ""

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
          externalFlights={globeFlights.length > 0 ? globeFlights : null}
          onFlightClick={handleFlightClick}
        />
      </div>

      {/* Live indicator */}
      <div className="fixed top-5 left-5 z-30">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
          {isLive ? (
            <>
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="text-[10px] font-mono text-green-400/80">LIVE</span>
              <span className="text-[10px] font-mono text-white/25">{lastFetch}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-white/30" />
              <span className="text-[10px] font-mono text-white/30">CONNECTING...</span>
            </>
          )}
        </div>
      </div>

      {/* Search bar */}
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
              placeholder="Search flights, airlines, airports..."
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
                    <span className="text-[10px] font-mono text-white/40">{result.airline}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-white/40">
                      {result.depIata} → {result.arrIata}
                    </span>
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

      {/* ═══ FLIGHT DETAIL PANEL ═══ */}
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-mono font-bold text-white">{selected.callsign}</h2>
                    {selected.hasLiveGps && (
                      <span className="text-[9px] font-mono text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">GPS</span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-white/40 mt-0.5">{selected.airline}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {/* Route */}
              <div className="px-5 py-3 border-b border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-center">
                    <span className="text-lg font-mono font-bold text-white">{selected.depIata}</span>
                    <p className="text-[9px] font-mono text-white/30 mt-0.5 max-w-[120px] truncate">{selected.depAirport}</p>
                  </div>
                  <div className="flex-1 mx-4 flex items-center">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-mono text-white/30 mx-2">{selected.aircraft}</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-mono font-bold text-white">{selected.arrIata}</span>
                    <p className="text-[9px] font-mono text-white/30 mt-0.5 max-w-[120px] truncate">{selected.arrAirport}</p>
                  </div>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-white/30 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.round(selected.progress * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-white/20 mt-1 block text-center">
                  {Math.round(selected.progress * 100)}% COMPLETE
                </span>
              </div>

              {/* Scrollable content */}
              <div className="px-5 py-4 flex-1 overflow-y-auto">

                {/* Telemetry */}
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-white/50" />
                  <span className="text-[10px] font-mono tracking-[0.15em] text-white/50">
                    {selected.hasLiveGps ? "LIVE GPS TELEMETRY" : "ESTIMATED TELEMETRY"}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ml-auto ${
                    selected.hasLiveGps ? "bg-green-400" : "bg-white/30"
                  }`} />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <TelemetryCell label="ALTITUDE" value={`${displayAlt.toLocaleString()} ft`} />
                  <TelemetryCell label="SPEED" value={`${displaySpd} kts`} />
                  <TelemetryCell label="G-FORCE" value={`${(1.0 + (Math.random() - 0.5) * 0.04).toFixed(2)}G`} />
                  <TelemetryCell label="HEADING" value={`${displayHdg}°`} />
                  <TelemetryCell
                    label="POSITION"
                    value={`${selected.currentPos[1].toFixed(2)}°, ${selected.currentPos[0].toFixed(2)}°`}
                    span2
                  />
                </div>

                {/* Dynamic NFT — nominal state */}
                <div className="mt-5">
                  <span className="text-[10px] font-mono tracking-[0.15em] text-white/30 block mb-2">
                    XRPL DYNAMIC NFT
                  </span>
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 space-y-2">
                    <Row label="TOKEN ID" value={nftTokenId} />
                    <Row label="STATUS" value="NOMINAL" valueColor="text-green-400/60" />
                    <Row label="URI" value={`ipfs://${nominalCid.slice(0, 18)}...`} />
                    <Row label="DOMAIN" value="airline.permitted" />
                  </div>
                </div>

                {/* IPFS Payload — collapsible */}
                <div className="mt-4">
                  <button
                    onClick={() => setIpfsExpanded(!ipfsExpanded)}
                    className="flex items-center justify-between w-full group"
                  >
                    <span className="text-[10px] font-mono tracking-[0.15em] text-white/30">
                      PINATA IPFS PAYLOAD
                    </span>
                    {ipfsExpanded
                      ? <ChevronUp className="w-3 h-3 text-white/20 group-hover:text-white/40" />
                      : <ChevronDown className="w-3 h-3 text-white/20 group-hover:text-white/40" />}
                  </button>
                  <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.02] overflow-hidden">
                    <div className="px-3 py-2 border-b border-white/5">
                      <span className="text-[9px] font-mono text-white/30">CID: {nominalCid}</span>
                    </div>
                    {ipfsExpanded && (
                      <div className="p-3 animate-fade-slide-in">
                        <pre className="text-[9px] font-mono text-white/40 leading-relaxed whitespace-pre-wrap">
{JSON.stringify({
  flight: selected.callsign,
  airline: selected.airline,
  route: `${selected.depIata} → ${selected.arrIata}`,
  timestamp: new Date().toISOString(),
  status: "NOMINAL",
  telemetry: {
    altitude_ft: displayAlt,
    speed_kts: displaySpd,
    heading_deg: displayHdg,
    g_force: 1.01,
    latitude: Number(selected.currentPos[1].toFixed(4)),
    longitude: Number(selected.currentPos[0].toFixed(4)),
  },
}, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* Escrow — locked state */}
                <div className="mt-4">
                  <span className="text-[10px] font-mono tracking-[0.15em] text-white/30 block mb-2">
                    XRPL TOKEN ESCROW
                  </span>
                  <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-sm font-mono font-semibold text-white">100,000 RLUSD</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded">
                        LOCKED
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <Row label="CONDITION" value="Crash signature required" />
                      <Row label="DESTINATION" value="rescue-team.xrpl.wallet" />
                    </div>
                  </div>
                </div>

                {/* Emergency page options */}
                <div className="mt-6 mb-2 space-y-2">
                  <button
                    onClick={() => router.push(`/emergency?flight=${selectedIndex}&simulate=true`)}
                    className="w-full py-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.08] hover:border-red-500/30 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-red-400/60 group-hover:text-red-400" />
                      <span className="text-[11px] font-mono tracking-wider text-red-400/60 group-hover:text-red-400">
                        SIMULATE ANOMALY
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => router.push(`/emergency?flight=${selectedIndex}`)}
                    className="w-full py-2 rounded-lg border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-white/30 group-hover:text-white/50" />
                      <span className="text-[11px] font-mono tracking-wider text-white/30 group-hover:text-white/50">
                        AWAIT ARDUINO TRIGGER
                      </span>
                    </div>
                  </button>
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* Hint */}
      {!selected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <span className="text-[11px] font-mono text-white/20 tracking-wider">
            {flights.length > 0
              ? `TRACKING ${flights.length} LIVE FLIGHTS — CLICK TO VIEW`
              : "LOADING FLIGHT DATA..."}
          </span>
        </div>
      )}
    </div>
  )
}

function TelemetryCell({
  label, value, span2 = false,
}: {
  label: string; value: string; span2?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-white/8 bg-white/[0.02] p-2.5 ${span2 ? "col-span-2" : ""}`}>
      <span className="text-[9px] font-mono text-white/30 block mb-0.5">{label}</span>
      <span className="text-sm font-mono font-semibold text-white">{value}</span>
    </div>
  )
}

function Row({
  label, value, valueColor = "text-white/60",
}: {
  label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono text-white/30">{label}</span>
      <span className={`text-[10px] font-mono ${valueColor}`}>{value}</span>
    </div>
  )
}
