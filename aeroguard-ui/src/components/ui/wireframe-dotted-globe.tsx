"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"

interface FlightPath {
  from: [number, number]
  to: [number, number]
  progress: number
  speed: number
  routeDist: number
  label: string
}

export interface FlightRouteInfo {
  from: [number, number]
  to: [number, number]
  label: string
}

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
  showFlights?: boolean
  zoomLevel?: number
  highlightedFlight?: number | null
  frozen?: boolean
  onFlightClick?: (flightIndex: number) => void
}

export const FLIGHT_ROUTES: FlightRouteInfo[] = [
  { from: [-73.94, 40.67], to: [-0.12, 51.51], label: "JFK → LHR" },
  { from: [139.69, 35.69], to: [-118.24, 34.05], label: "NRT → LAX" },
  { from: [103.85, 1.35], to: [55.27, 25.2], label: "SIN → DXB" },
  { from: [-43.17, -22.91], to: [2.35, 48.86], label: "GIG → CDG" },
  { from: [151.21, -33.87], to: [114.17, 22.32], label: "SYD → HKG" },
  { from: [-99.13, 19.43], to: [-3.7, 40.42], label: "MEX → MAD" },
  { from: [37.62, 55.76], to: [100.5, 13.76], label: "SVO → BKK" },
  { from: [28.98, 41.01], to: [-87.63, 41.88], label: "IST → ORD" },
  { from: [77.1, 28.61], to: [121.47, 31.23], label: "DEL → PVG" },
  { from: [-79.38, 43.65], to: [12.5, 41.9], label: "YYZ → FCO" },
]

export default function RotatingEarth({
  width = 800,
  height = 600,
  className = "",
  showFlights = true,
  zoomLevel = 1,
  highlightedFlight = null,
  frozen = false,
  onFlightClick,
}: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const animationRef = useRef<number | null>(null)
  const zoomRef = useRef(zoomLevel)
  const scrollZoomRef = useRef(1)
  const highlightRef = useRef(highlightedFlight)
  const frozenRef = useRef(frozen)
  const onFlightClickRef = useRef(onFlightClick)
  const flightScreenPositions = useRef<{ x: number; y: number; index: number }[]>([])

  useEffect(() => { zoomRef.current = zoomLevel }, [zoomLevel])
  useEffect(() => { highlightRef.current = highlightedFlight }, [highlightedFlight])
  useEffect(() => { frozenRef.current = frozen }, [frozen])
  useEffect(() => { onFlightClickRef.current = onFlightClick }, [onFlightClick])

  const interpolateGreatCircle = useCallback(
    (from: [number, number], to: [number, number], t: number): [number, number] => {
      const interp = d3.geoInterpolate(from, to)
      return interp(t) as [number, number]
    },
    []
  )

  useEffect(() => {
    if (!canvasRef.current) return
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    const containerWidth = Math.min(width, window.innerWidth)
    const containerHeight = Math.min(height, window.innerHeight)
    const baseRadius = Math.min(containerWidth, containerHeight) / 3.2
    const dpr = window.devicePixelRatio || 1

    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    const projection = d3
      .geoOrthographic()
      .scale(baseRadius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }
      return inside
    }

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry
      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates
        if (!pointInPolygon(point, coordinates[0])) return false
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) return false
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) return true
          }
        }
        return false
      }
      return false
    }

    const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds
      const stepSize = dotSpacing * 0.08
      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
          }
        }
      }
      return dots
    }

    const allDots: { lng: number; lat: number }[] = []
    let landFeatures: any

    // Two speed regimes:
    // OVERVIEW: fast, lively animation matching the original look
    // TRACKING: realistic flight-tracker crawl (when a flight is selected)
    const OVERVIEW_GEO_SPEED = 0.0015
    const TRACKING_GEO_SPEED = 0.00003
    const flights: FlightPath[] = FLIGHT_ROUTES.map((route) => {
      const dist = d3.geoDistance(route.from, route.to)
      return {
        from: route.from,
        to: route.to,
        progress: Math.random() * 0.6 + 0.15,
        speed: OVERVIEW_GEO_SPEED / dist,
        routeDist: dist,
        label: route.label,
      }
    })

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight)

      const effectiveZoom = zoomRef.current * scrollZoomRef.current
      projection.scale(baseRadius * effectiveZoom)

      const currentScale = projection.scale()
      const scaleFactor = currentScale / baseRadius
      const highlighted = highlightRef.current

      // Globe background
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = "#000000"
      context.fill()

      // Glow
      const glowGradient = context.createRadialGradient(
        containerWidth / 2, containerHeight / 2, currentScale * 0.85,
        containerWidth / 2, containerHeight / 2, currentScale * 1.12
      )
      glowGradient.addColorStop(0, "rgba(255,255,255,0)")
      glowGradient.addColorStop(0.5, "rgba(255,255,255,0.02)")
      glowGradient.addColorStop(1, "rgba(255,255,255,0)")
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale * 1.12, 0, 2 * Math.PI)
      context.fillStyle = glowGradient
      context.fill()

      // Border
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.strokeStyle = "rgba(255,255,255,0.15)"
      context.lineWidth = 1 * scaleFactor
      context.stroke()

      if (landFeatures) {
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = "rgba(255,255,255,0.06)"
        context.lineWidth = 0.5 * scaleFactor
        context.stroke()

        context.beginPath()
        landFeatures.features.forEach((f: any) => path(f))
        context.strokeStyle = "rgba(255,255,255,0.2)"
        context.lineWidth = 0.7 * scaleFactor
        context.stroke()

        context.beginPath()
        landFeatures.features.forEach((f: any) => path(f))
        context.fillStyle = "rgba(255,255,255,0.03)"
        context.fill()

        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat])
          if (projected && projected[0] >= 0 && projected[0] <= containerWidth && projected[1] >= 0 && projected[1] <= containerHeight) {
            context.beginPath()
            context.arc(projected[0], projected[1], 1 * scaleFactor, 0, 2 * Math.PI)
            context.fillStyle = "rgba(255,255,255,0.15)"
            context.fill()
          }
        })

        if (showFlights) {
          const positions: { x: number; y: number; index: number }[] = []

          flights.forEach((flight, idx) => {
            const isHighlighted = highlighted === idx
            const dimmed = highlighted !== null && !isHighlighted

            const arcPoints: [number, number][] = []
            for (let t = 0; t <= 1; t += 0.02) {
              const pt = interpolateGreatCircle(flight.from, flight.to, t)
              const proj = projection(pt)
              if (proj) arcPoints.push(proj as [number, number])
            }

            if (arcPoints.length > 1) {
              context.beginPath()
              context.moveTo(arcPoints[0][0], arcPoints[0][1])
              for (let i = 1; i < arcPoints.length; i++) {
                const dx = arcPoints[i][0] - arcPoints[i - 1][0]
                const dy = arcPoints[i][1] - arcPoints[i - 1][1]
                if (Math.sqrt(dx * dx + dy * dy) < 50) {
                  context.lineTo(arcPoints[i][0], arcPoints[i][1])
                } else {
                  context.moveTo(arcPoints[i][0], arcPoints[i][1])
                }
              }
              context.strokeStyle = isHighlighted
                ? "rgba(255,255,255,0.3)"
                : dimmed
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(255,255,255,0.08)"
              context.lineWidth = (isHighlighted ? 1.4 : 0.8) * scaleFactor
              context.stroke()
            }

            const planePos = interpolateGreatCircle(flight.from, flight.to, flight.progress)
            const projPlane = projection(planePos)
            if (projPlane) {
              positions.push({ x: projPlane[0], y: projPlane[1], index: idx })

              const dotAlpha = dimmed ? 0.2 : 0.9
              const glowAlpha = dimmed ? 0.1 : 0.4
              const dotRadius = isHighlighted ? 3.5 : 2
              const glowRadius = isHighlighted ? 12 : 6

              const pg = context.createRadialGradient(
                projPlane[0], projPlane[1], 0,
                projPlane[0], projPlane[1], glowRadius * scaleFactor
              )
              pg.addColorStop(0, `rgba(255,255,255,${glowAlpha})`)
              pg.addColorStop(1, "rgba(255,255,255,0)")
              context.beginPath()
              context.arc(projPlane[0], projPlane[1], glowRadius * scaleFactor, 0, 2 * Math.PI)
              context.fillStyle = pg
              context.fill()

              context.beginPath()
              context.arc(projPlane[0], projPlane[1], dotRadius * scaleFactor, 0, 2 * Math.PI)
              context.fillStyle = `rgba(255,255,255,${dotAlpha})`
              context.fill()

              // Trail covers a fixed geographic distance (in radians) behind
              // the plane, so it looks proportional at every zoom level.
              const TRAIL_GEO_STEP = 0.003 // ~19 km between each trail dot
              const trailLen = isHighlighted ? 20 : 12
              const trailProgressStep = TRAIL_GEO_STEP / flight.routeDist
              for (let i = 1; i <= trailLen; i++) {
                const trailT = flight.progress - i * trailProgressStep
                if (trailT < 0) continue
                const trailPos = interpolateGreatCircle(flight.from, flight.to, trailT)
                const projTrail = projection(trailPos)
                if (projTrail) {
                  const alpha = (1 - i / trailLen) * (dimmed ? 0.1 : 0.4)
                  context.beginPath()
                  context.arc(projTrail[0], projTrail[1], (2 - i * 0.06) * scaleFactor, 0, 2 * Math.PI)
                  context.fillStyle = `rgba(255,255,255,${alpha})`
                  context.fill()
                }
              }

              if (isHighlighted) {
                context.font = `${11 * scaleFactor}px monospace`
                context.fillStyle = "rgba(255,255,255,0.85)"
                context.fillText(flight.label, projPlane[0] + 10 * scaleFactor, projPlane[1] - 10 * scaleFactor)
              }
            }

            const epAlpha = dimmed ? 0.05 : 0.15
            const epCoreAlpha = dimmed ? 0.15 : 0.6
            ;[flight.from, flight.to].forEach((coord) => {
              const proj = projection(coord)
              if (proj) {
                context.beginPath()
                context.arc(proj[0], proj[1], 2.5 * scaleFactor, 0, 2 * Math.PI)
                context.fillStyle = `rgba(255,255,255,${epAlpha})`
                context.fill()
                context.beginPath()
                context.arc(proj[0], proj[1], 1 * scaleFactor, 0, 2 * Math.PI)
                context.fillStyle = `rgba(255,255,255,${epCoreAlpha})`
                context.fill()
              }
            })
          })

          flightScreenPositions.current = positions
        }
      }
    }

    const loadWorldData = async () => {
      try {
        setIsLoading(true)
        const res = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json"
        )
        if (!res.ok) throw new Error("Failed to load land data")
        landFeatures = await res.json()
        landFeatures.features.forEach((feature: any) => {
          generateDotsInPolygon(feature, 16).forEach(([lng, lat]) => allDots.push({ lng, lat }))
        })
        render()
        setIsLoading(false)
      } catch {
        setError("Failed to load map data")
        setIsLoading(false)
      }
    }

    const rotation: [number, number] = [0, -20]
    let autoRotate = true

    const animate = () => {
      if (!frozenRef.current && autoRotate) {
        rotation[0] += 0.3
      }
      projection.rotate(rotation)

      const isTracking = highlightRef.current !== null
      flights.forEach((f) => {
        const geoSpeed = isTracking ? TRACKING_GEO_SPEED : OVERVIEW_GEO_SPEED
        f.speed = geoSpeed / f.routeDist
        f.progress += f.speed
        if (f.progress > 1) f.progress = 0
      })

      render()
      animationRef.current = requestAnimationFrame(animate)
    }

    let dragStartX = 0
    let dragStartY = 0

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      dragStartX = event.clientX
      dragStartY = event.clientY
      const startRotation: [number, number] = [...rotation]

      const handleMouseMove = (e: MouseEvent) => {
        rotation[0] = startRotation[0] + (e.clientX - dragStartX) * 0.4
        rotation[1] = Math.max(-90, Math.min(90, startRotation[1] - (e.clientY - dragStartY) * 0.4))
      }

      const handleMouseUp = (e: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)

        const totalDrag = Math.sqrt(
          (e.clientX - dragStartX) ** 2 + (e.clientY - dragStartY) ** 2
        )

        if (totalDrag < 8 && onFlightClickRef.current) {
          const rect = canvas.getBoundingClientRect()
          const scaleX = containerWidth / rect.width
          const scaleY = containerHeight / rect.height
          const cx = (e.clientX - rect.left) * scaleX
          const cy = (e.clientY - rect.top) * scaleY
          const hitRadius = 35
          let closest: { index: number; dist: number } | null = null

          for (const pos of flightScreenPositions.current) {
            const dist = Math.sqrt((pos.x - cx) ** 2 + (pos.y - cy) ** 2)
            if (dist < hitRadius && (!closest || dist < closest.dist)) {
              closest = { index: pos.index, dist }
            }
          }

          if (closest) {
            onFlightClickRef.current(closest.index)
            return
          }
        }

        if (!frozenRef.current) {
          setTimeout(() => { autoRotate = true }, 1500)
        }
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = event.deltaY > 0 ? 0.93 : 1.07
      scrollZoomRef.current = Math.max(0.5, Math.min(4, scrollZoomRef.current * factor))
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("wheel", handleWheel, { passive: false })

    loadWorldData().then(() => {
      animationRef.current = requestAnimationFrame(animate)
    })

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [width, height, showFlights, interpolateGreatCircle])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black p-8 ${className}`}>
        <p className="text-red-500 text-sm font-mono">{error}</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="cursor-grab active:cursor-grabbing"
      />
    </div>
  )
}
