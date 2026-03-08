"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Radio, Mic, MicOff } from "lucide-react"

// ─────────────────────────────────────────────────────────────
// ELEVENLABS INTEGRATION PORT
//
// This component renders the Mayday voice agent overlay.
// To connect ElevenLabs Conversational AI:
//
//   1. Pass `onMaydayActivated` — fires when the crash cascade
//      reaches the MAYDAY step.  Use it to kick off the
//      ElevenLabs agent session, passing flight context.
//
//   2. Call the returned ref's methods to push live data:
//        ref.current.pushTranscript(text)   — appends to transcript
//        ref.current.setAudioLevel(0-1)     — drives waveform bars
//        ref.current.endSession()           — marks session complete
//
//   3. The `flightContext` prop contains all the data the voice
//      agent needs (callsign, coordinates, CIDs, etc.)
// ─────────────────────────────────────────────────────────────

export interface MaydayFlightContext {
  callsign: string
  airline: string
  coordinates: [number, number]
  altitude: number
  gForce: number
  pinataCid: string
  nftTokenId: string
}

export interface MaydayOverlayHandle {
  pushTranscript: (text: string) => void
  setAudioLevel: (level: number) => void
  endSession: () => void
}

interface MaydayOverlayProps {
  active: boolean
  flightContext: MaydayFlightContext | null
  onMaydayActivated?: (context: MaydayFlightContext) => void
  overlayRef?: React.MutableRefObject<MaydayOverlayHandle | null>
}

export default function MaydayOverlay({
  active,
  flightContext,
  onMaydayActivated,
  overlayRef,
}: MaydayOverlayProps) {
  const [transcriptLines, setTranscriptLines] = useState<string[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const activatedRef = useRef(false)

  // Expose handle for ElevenLabs integration
  useEffect(() => {
    if (!overlayRef) return
    overlayRef.current = {
      pushTranscript: (text: string) => {
        setTranscriptLines((prev) => [...prev, text])
      },
      setAudioLevel: (level: number) => {
        setAudioLevel(Math.max(0, Math.min(1, level)))
      },
      endSession: () => {
        setSessionEnded(true)
        setAudioLevel(0)
      },
    }
  }, [overlayRef])

  // Fire onMaydayActivated once when becoming active
  useEffect(() => {
    if (active && flightContext && !activatedRef.current) {
      activatedRef.current = true
      onMaydayActivated?.(flightContext)

      // If no ElevenLabs is connected, run a local simulation
      // so the UI still looks alive during demos
      setSimulating(true)
      setTranscriptLines([])
      setSessionEnded(false)

      const lines = [
        `MAYDAY MAYDAY MAYDAY — AeroGuard autonomous agent for ${flightContext.callsign}`,
        `Catastrophic anomaly detected — G-force ${flightContext.gForce.toFixed(1)}G recorded`,
        `Last known position: ${flightContext.coordinates[1].toFixed(4)}°N, ${flightContext.coordinates[0].toFixed(4)}°E`,
        `Altitude at event: ${flightContext.altitude.toLocaleString()} feet`,
        `Telemetry anchored to IPFS — CID: ${flightContext.pinataCid}`,
        `XRPL Dynamic NFT updated — Token: ${flightContext.nftTokenId}`,
        `Emergency escrow released — 100,000 RLUSD unlocked for SAR`,
        `Requesting immediate search and rescue response...`,
      ]

      const timers: ReturnType<typeof setTimeout>[] = []
      lines.forEach((line, i) => {
        timers.push(
          setTimeout(() => {
            setTranscriptLines((prev) => [...prev, line])
          }, 800 + i * 1800)
        )
      })

      timers.push(
        setTimeout(() => {
          setSessionEnded(true)
          setSimulating(false)
        }, 800 + lines.length * 1800 + 1000)
      )

      return () => timers.forEach(clearTimeout)
    }
    if (!active) {
      activatedRef.current = false
      setTranscriptLines([])
      setSessionEnded(false)
      setSimulating(false)
      setAudioLevel(0)
    }
  }, [active, flightContext, onMaydayActivated])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcriptLines])

  // Tick to animate waveform bars
  const [waveformTick, setWaveformTick] = useState(0)
  useEffect(() => {
    if (!active || sessionEnded) return
    const iv = setInterval(() => setWaveformTick((t) => t + 1), 120)
    return () => clearInterval(iv)
  }, [active, sessionEnded])

  const effectiveLevel = simulating && !sessionEnded ? 0.5 + Math.random() * 0.4 : audioLevel

  if (!active) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-slide-in">
      <div className="mx-auto max-w-2xl mb-4 px-4">
        <div className="rounded-xl border border-red-500/30 bg-black/90 backdrop-blur-xl overflow-hidden animate-pulse-red">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-red-500/10 bg-red-500/[0.03]">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.2em] text-red-400 font-semibold">
              AEROGUARD AI MAYDAY — {flightContext?.callsign || "UNKNOWN"}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {sessionEnded ? (
                <MicOff className="w-3.5 h-3.5 text-white/20" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              )}
              <span className="text-[9px] font-mono text-white/30">
                {sessionEnded ? "SESSION ENDED" : "TRANSMITTING"}
              </span>
            </div>
          </div>

          {/* Waveform */}
          <div className="flex items-center justify-center gap-[2px] h-10 px-4 bg-black/40">
            {Array.from({ length: 48 }).map((_, i) => {
              const phase = waveformTick * 0.3 + i * 0.35
              const barHeight = sessionEnded
                ? 10
                : Math.max(10, effectiveLevel * 85 * (0.3 + 0.7 * Math.abs(Math.sin(phase))))
              return (
                <div
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: sessionEnded
                      ? "rgba(255,255,255,0.08)"
                      : `rgba(239, 68, 68, ${0.25 + effectiveLevel * 0.5})`,
                    transition: "height 100ms ease-out",
                  }}
                />
              )
            })}
          </div>

          {/* Transcript */}
          <div className="max-h-28 overflow-y-auto px-4 py-2.5 space-y-1">
            {transcriptLines.map((line, i) => (
              <p
                key={i}
                className="text-[11px] font-mono leading-relaxed animate-fade-slide-in"
                style={{ color: i === transcriptLines.length - 1 ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.45)" }}
              >
                {line}
              </p>
            ))}
            {transcriptLines.length === 0 && (
              <p className="text-[11px] font-mono text-white/20">Initiating voice agent...</p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
