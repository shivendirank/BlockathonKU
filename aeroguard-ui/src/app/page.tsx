"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import RotatingEarth from "@/components/ui/wireframe-dotted-globe"
import type { FlightRouteInfo } from "@/components/ui/wireframe-dotted-globe"
import type { LiveFlight } from "@/lib/types"

export default function LandingPage() {
  const router = useRouter()
  const [isZooming, setIsZooming] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [flights, setFlights] = useState<LiveFlight[]>([])

  useEffect(() => {
    setMounted(true)
    fetch("/api/flights")
      .then((r) => r.json())
      .then((d) => { if (d.flights?.length) setFlights(d.flights) })
      .catch(() => {})
  }, [])

  const globeFlights: FlightRouteInfo[] | null = useMemo(() => {
    if (flights.length === 0) return null
    return flights.map((f) => ({
      from: f.depCoords,
      to: f.arrCoords,
      label: `${f.callsign} (${f.depIata} → ${f.arrIata})`,
      initialProgress: f.progress,
    }))
  }, [flights])

  const handleEnter = useCallback(() => {
    if (isZooming) return
    setIsZooming(true)

    let frame = 0
    const totalFrames = 60
    const startZoom = zoomLevel
    const targetZoom = startZoom + 0.25

    const zoomAnimation = () => {
      frame++
      const progress = frame / totalFrames
      const eased = 1 - Math.pow(1 - progress, 3)
      setZoomLevel(startZoom + eased * (targetZoom - startZoom))

      if (frame < totalFrames) {
        requestAnimationFrame(zoomAnimation)
      } else {
        router.push("/dashboard")
      }
    }
    requestAnimationFrame(zoomAnimation)
  }, [isZooming, zoomLevel, router])

  const handleFlightClick = useCallback((flightIndex: number) => {
    router.push(`/dashboard?flight=${flightIndex}`)
  }, [router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleEnter()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleEnter])

  if (!mounted) return <div className="min-h-screen bg-black" />

  return (
    <div className="relative min-h-screen bg-black overflow-hidden select-none">
      <div className="absolute inset-0 flex items-center justify-center">
        <RotatingEarth
          width={window.innerWidth}
          height={window.innerHeight}
          showFlights={true}
          zoomLevel={zoomLevel}
          externalFlights={globeFlights}
          onFlightClick={handleFlightClick}
        />
      </div>
    </div>
  )
}
