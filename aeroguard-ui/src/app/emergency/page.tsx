"use client"

import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  AlertTriangle, Activity, Lock, Unlock, ChevronDown, ChevronUp,
  ArrowLeft, Zap, Shield, Plane, Radio, Mic, MicOff,
} from "lucide-react"
import type { LiveFlight } from "@/lib/types"
import type { MaydayFlightContext } from "@/components/ui/mayday-overlay"
import { ElevenLabsConversation } from "@/lib/elevenlabs-conversation"

// ── Crash cascade definition ────────────────────────────────

interface CrashEvent {
  id: string
  label: string
  detail: string
  timestamp: number
}

const CRASH_STEPS: { id: string; label: string; detail: string; delayMs: number }[] = [
  { id: "crash",  label: "CRASH DETECTED",     detail: "Edge trigger — IMU accelerometer recorded catastrophic G-force anomaly (> 3.5G threshold)", delayMs: 800 },
  { id: "pinata", label: "TELEMETRY ANCHORED",  detail: "Pinata gateway — final telemetry JSON payload pushed to IPFS, immutable CID generated",     delayMs: 2400 },
  { id: "nft",    label: "DNFT URI UPDATED",    detail: "XRPL — NFTokenModify transaction fired, Dynamic NFT status URI swapped to crash CID",       delayMs: 4000 },
  { id: "escrow", label: "ESCROW RELEASED",     detail: "XRPL — TokenEscrow condition met, 100,000 RLUSD released to search-and-rescue wallet",      delayMs: 5600 },
  { id: "mayday", label: "MAYDAY INITIATED",    detail: "ElevenLabs AI voice agent activated via MCP bridge — broadcasting to ATC",                   delayMs: 7200 },
]

// ── Page wrapper ────────────────────────────────────────────

export default function EmergencyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <EmergencyContent />
    </Suspense>
  )
}

// ── Main content ────────────────────────────────────────────

function EmergencyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [flight, setFlight] = useState<LiveFlight | null>(null)
  const [ipfsExpanded, setIpfsExpanded] = useState(false)

  // Crash state
  const [cascadeStarted, setCascadeStarted] = useState(false)
  const [events, setEvents] = useState<CrashEvent[]>([])
  const [nftUpdated, setNftUpdated] = useState(false)
  const [escrowReleased, setEscrowReleased] = useState(false)
  const [maydayActive, setMaydayActive] = useState(false)
  const [gForce, setGForce] = useState(0)
  const [crashCid] = useState(`QmCrash${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 8)}`)
  const [txHash] = useState(`${Math.random().toString(36).slice(2, 10).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`)

  const isSimulation = searchParams.get("simulate") === "true"
  const [waitingForArduino, setWaitingForArduino] = useState(!isSimulation)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cascadeTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const cascadeStartedRef = useRef(false)

  // Telemetry degradation
  const [tick, setTick] = useState(0)
  const tickRef = useRef(0)

  // Mayday transcript simulation
  const [transcriptLines, setTranscriptLines] = useState<string[]>([])
  const [maydayEnded, setMaydayEnded] = useState(false)
  const [waveformTick, setWaveformTick] = useState(0)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  
  // ElevenLabs conversation state
  const [userMessage, setUserMessage] = useState("")
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false)
  const [conversationActive, setConversationActive] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
  const [voiceMockMode, setVoiceMockMode] = useState(false)
  const conversationRef = useRef<ElevenLabsConversation | null>(null)
  const stopMicRef = useRef<(() => void) | null>(null)

  // Fetch the specific flight
  useEffect(() => {
    setMounted(true)
    const idx = searchParams.get("flight")
    if (idx === null) { router.push("/dashboard"); return }

    fetch("/api/flights")
      .then((r) => r.json())
      .then((d) => {
        const i = parseInt(idx, 10)
        if (d.flights?.[i]) setFlight(d.flights[i])
        else router.push("/dashboard")
      })
      .catch(() => router.push("/dashboard"))
  }, [searchParams, router])

  // Start the cascade
  const startCascade = useCallback((triggerGForce: number) => {
    if (cascadeStartedRef.current) return
    cascadeStartedRef.current = true
    setCascadeStarted(true)
    setGForce(triggerGForce)
    setWaitingForArduino(false)

    CRASH_STEPS.forEach((step) => {
      const timer = setTimeout(() => {
        setEvents((prev) => [...prev, { id: step.id, label: step.label, detail: step.detail, timestamp: Date.now() }])
        
        if (step.id === "nft") {
          setNftUpdated(true)
          // Call XRPL API to update Dynamic NFT with crash CID
          fetch("/api/xrpl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              data: {
                nft_token_id: process.env.NEXT_PUBLIC_XRPL_NFT_TOKEN_ID || "",
                crash_cid: crashCid
              }
            })
          })
          .then(res => res.json())
          .then(data => {
            console.log("✅ XRPL NFT updated:", data)
            if (data.explorer_url) {
              console.log(`🔗 Transaction: ${data.explorer_url}`)
            }
          })
          .catch(err => console.error("❌ XRPL NFT update failed:", err))
        }
        
        if (step.id === "escrow") {
          setEscrowReleased(true)
          // Call XRPL API to release escrow funds
          const finishAfter = Math.floor(Date.now() / 1000) + 60 // Release after 1 minute
          fetch("/api/xrpl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "escrow_create",
              data: {
                amount: process.env.NEXT_PUBLIC_ESCROW_RLUSD_AMOUNT || "100000",
                destination: process.env.NEXT_PUBLIC_RESCUE_TEAM_ADDRESS || "",
                finish_after: finishAfter
              }
            })
          })
          .then(res => res.json())
          .then(data => {
            console.log("✅ XRPL Escrow created:", data)
            if (data.explorer_url) {
              console.log(`🔗 Transaction: ${data.explorer_url}`)
            }
          })
          .catch(err => console.error("❌ XRPL Escrow failed:", err))
        }
        
        if (step.id === "mayday") setMaydayActive(true)
      }, step.delayMs)
      cascadeTimers.current.push(timer)
    })
  }, [])

  // Mayday transcript — starts when maydayActive flips to true  
  useEffect(() => {
    if (!maydayActive || !flight) return
    
    // Initial automated mayday from ElevenLabs agent
    setConversationActive(true)
    setIsAgentSpeaking(true)
    
    const initialMessage = `MAYDAY MAYDAY MAYDAY — FlightChain autonomous agent for ${flight.callsign}. ` +
      `Catastrophic anomaly detected — G-force ${gForce.toFixed(1)}G recorded. ` +
      `Last known position: ${flight.currentPos[1].toFixed(4)}°N, ${flight.currentPos[0].toFixed(4)}°E. ` +
      `Altitude at event: ${flight.altitude.toLocaleString()} feet. ` +
      `Telemetry anchored to IPFS. Emergency escrow released. Awaiting rescue coordination.`
    
    setTranscriptLines([`[AGENT]: ${initialMessage}`])
    
    // Update MCP endpoint with crash sensor data for agent to query
    fetch("/api/mcp/flight-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flight: { 
          callsign: flight.callsign, 
          aircraft: flight.aircraft,
          airline: flight.airline,
          depIata: flight.depIata,
          arrIata: flight.arrIata
        },
        latitude: flight.currentPos[1],
        longitude: flight.currentPos[0],
        altitude: flight.altitude,
        gforce: gForce,
        temperature: 28.4,
        pressure: 85.3,
        humidity: 45.2,
        ipfs_cid: crashCid,
        xrpl_tx: txHash,
        escrow_released: true,
        event_time: new Date().toISOString()
      })
    }).catch(() => {})
    
    setTimeout(() => setIsAgentSpeaking(false), 3000)
    
  }, [maydayActive, flight, gForce])
  
  // Initialize real ElevenLabs WebSocket conversation when mayday activates
  useEffect(() => {
    if (!maydayActive || conversationRef.current || !flight) return
    
    console.log('🎙️ Initializing ElevenLabs voice agent...')
    
    // Create flight context to pass to agent
    const flightContext = {
      callsign: flight.callsign,
      aircraft: flight.aircraft,
      airline: flight.airline,
      route: `${flight.depIata} to ${flight.arrIata}`,
      latitude: flight.currentPos[1],
      longitude: flight.currentPos[0],
      altitude: flight.altitude,
      gforce: gForce,
      ipfs_cid: crashCid,
      xrpl_tx: txHash,
      xrpl_status: nftUpdated ? 'updated' : 'pending',
      escrow_status: escrowReleased ? 'released' : 'pending'
    }
    
    // Initialize conversation with callbacks
    const conversation = new ElevenLabsConversation({
      agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '',
      flightContext,
      onConnect: () => {
        console.log('✅ Voice agent connected')
        setConversationActive(true)
        setTranscriptLines(prev => [...prev, 
          `[SYSTEM]: ✅ Voice agent connected. Microphone active. You can now speak or type your questions.`
        ])
      },
      onDisconnect: () => {
        console.log('⚠️ Voice agent disconnected')
        setConversationActive(false)
        setTranscriptLines(prev => [...prev, 
          `[SYSTEM]: ⚠️ Voice agent disconnected. Attempting to reconnect...`
        ])
      },
      onError: (error) => {
        console.error('❌ Voice agent error:', error)
        if (error.includes('MOCK_MODE:')) {
          setVoiceMockMode(true)
          setConversationActive(true)
          setTranscriptLines(prev => [...prev,
            `[SYSTEM]: 🎭 Voice running in mock mode (no API keys required).`,
            `[SYSTEM]: ✅ You can still type questions and get full simulated emergency responses.`
          ])
          return
        }
        setTranscriptLines(prev => [...prev, 
          `[SYSTEM]: ❌ Error: ${error}`
        ])
        // If API key error, show helpful message
        if (error.includes('permission') || error.includes('401')) {
          setTranscriptLines(prev => [...prev, 
            `[SYSTEM]: 💡 Create API key with "ElevenAgents Write" at https://elevenlabs.io/app/settings/api-keys`
          ])
        }
      },
      onAgentResponse: (text) => {
        console.log('📢 Agent response:', text)
        setTranscriptLines(prev => [...prev, `[AGENT]: ${text}`])
        setIsAgentSpeaking(false)
      },
      onModeChange: (mode) => {
        console.log('🔄 Agent mode:', mode)
        setIsAgentSpeaking(mode === 'speaking')
        setIsMicActive(mode === 'listening')
      }
    })
    
    conversationRef.current = conversation
    
    // Connect to ElevenLabs
    conversation.connect()
      .then(() => {
        console.log('✅ Successfully connected to voice agent')
        
        // Wait a moment then send initial prompt to trigger agent's mayday message
        setTimeout(() => {
          if (conversationRef.current) {
            const initialPrompt = `URGENT: Catastrophic crash detected for flight ${flight.callsign}. ` +
              `Begin emergency broadcast. State "MAYDAY MAYDAY MAYDAY" followed by flight information, ` +
              `crash coordinates, sensor readings, and blockchain verification status.`
            
            conversationRef.current.sendText(initialPrompt)
              .then(() => {
                console.log('✅ Initial mayday prompt sent to agent')
                setTranscriptLines(prev => [...prev, 
                  `[SYSTEM]: 🚨 Initiating emergency broadcast protocol...`
                ])
              })
              .catch((error) => {
                console.error('❌ Failed to send initial prompt:', error)
              })
          }
        }, 2000) // Wait 2 seconds after connection before triggering
      })
      .catch((error) => {
        console.error('❌ Failed to connect:', error)
        if (String(error?.message || error).includes('MOCK_MODE:')) {
          setVoiceMockMode(true)
          setConversationActive(true)
          setTranscriptLines(prev => [...prev,
            `[SYSTEM]: 🎭 Voice running in mock mode (no API keys required).`,
            `[SYSTEM]: 💡 Type: "what's the status?" to continue the demo.`
          ])
          return
        }
        setTranscriptLines(prev => [...prev, 
          `[SYSTEM]: ❌ Failed to connect to voice agent. Check console for details.`,
          `[SYSTEM]: 💡 Make sure ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are configured in Vercel environment variables.`
        ])
      })

    return () => {
      console.log('🔌 Cleaning up voice agent connection')
      if (conversationRef.current) {
        conversationRef.current.disconnect()
        conversationRef.current = null
      }
    }
  }, [maydayActive, flight, gForce, crashCid, nftUpdated, txHash, escrowReleased])
  
  // Send text message to ElevenLabs agent
  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim() || isAgentSpeaking) return
    
    setTranscriptLines(prev => [...prev, `[YOU]: ${userMessage}`])
    const message = userMessage
    const lowered = userMessage.toLowerCase()
    setUserMessage("")
    setIsAgentSpeaking(true)

    if (voiceMockMode || !conversationRef.current) {
      setTimeout(() => {
        let response = ""
        if (lowered.includes("status") || lowered.includes("report")) {
          response = `Flight ${flight?.callsign || 'Unknown'} experienced catastrophic failure at ${gForce.toFixed(1)} G. Last position ${flight?.currentPos[1].toFixed(4)} N, ${flight?.currentPos[0].toFixed(4)} E at ${flight?.altitude.toLocaleString()} feet. IPFS evidence CID: ${crashCid}. XRPL tx: ${txHash}. Escrow status: ${escrowReleased ? 'released' : 'pending'}.`
        } else if (lowered.includes("ipfs") || lowered.includes("cid")) {
          response = `Crash evidence is anchored to IPFS with CID ${crashCid}. This CID is content-addressed and tamper-evident.`
        } else if (lowered.includes("xrp") || lowered.includes("xrpl") || lowered.includes("nft")) {
          response = `The aircraft Digital Twin NFT was updated on XRPL using NFTokenModify. Transaction reference: ${txHash}.`
        } else if (lowered.includes("sensor") || lowered.includes("g-force") || lowered.includes("gforce")) {
          response = `Sensor snapshot: G-force ${gForce.toFixed(1)} G, temperature 28.4 C, pressure 85.3 kPa, humidity 45.2 percent.`
        } else {
          response = "Mock agent active. Ask about status, sensors, IPFS CID, XRPL transaction, or rescue escrow."
        }
        setTranscriptLines(prev => [...prev, `[AGENT]: ${response}`])
        setIsAgentSpeaking(false)
      }, 700)
      return
    }
    
    try {
      await conversationRef.current.sendText(message)
      console.log('✅ Message sent to agent')
    } catch (error) {
      console.error('❌ Failed to send message:', error)
      setTranscriptLines(prev => [...prev, `[SYSTEM]: ❌ Failed to send message`])
      setIsAgentSpeaking(false)
    }
  }, [userMessage, isAgentSpeaking, voiceMockMode, flight, gForce, crashCid, txHash, escrowReleased])

  // Toggle microphone on/off
  const handleToggleMicrophone = useCallback(async () => {
    if (voiceMockMode) {
      setTranscriptLines(prev => [...prev, `[SYSTEM]: 🎭 Mock mode active. Use text input below for voice-agent simulation.`])
      return
    }

    if (!conversationRef.current) {
      setTranscriptLines(prev => [...prev, `[SYSTEM]: ⚠️ Voice agent not connected`])
      return
    }

    try {
      if (isMicActive) {
        await conversationRef.current.stopMicrophone()
        setIsMicActive(false)
        setTranscriptLines(prev => [...prev, `[SYSTEM]: 🔇 Microphone disabled`])
      } else {
        const stopMic = await conversationRef.current.startMicrophone()
        stopMicRef.current = stopMic
        setIsMicActive(true)
        setTranscriptLines(prev => [...prev, `[SYSTEM]: 🎤 Microphone enabled - speak now`])
      }
    } catch (error) {
      console.error('❌ Microphone toggle error:', error)
      setTranscriptLines(prev => [...prev, `[SYSTEM]: ❌ Microphone error - check browser permissions`])
    }
  }, [isMicActive, voiceMockMode])
  
  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [transcriptLines])

  // Manual trigger fallback (for testing without Arduino)
  const handleManualTrigger = useCallback(() => {
    const fakeG = 3.8 + Math.random() * 1.5
    if (pollRef.current) clearInterval(pollRef.current)
    startCascade(fakeG)
  }, [startCascade])

  // Simulation mode: auto-start cascade after a short delay
  useEffect(() => {
    if (!flight || !isSimulation || cascadeStartedRef.current) return
    const t = setTimeout(() => {
      startCascade(3.8 + Math.random() * 1.5)
    }, 1200)
    return () => clearTimeout(t)
  }, [flight, isSimulation, startCascade])

  // Arduino mode: poll for hardware trigger
  useEffect(() => {
    if (!flight || isSimulation || cascadeStartedRef.current) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/arduino/trigger")
        const data = await res.json()
        if (data.triggered) {
          startCascade(data.gForce || 4.0)
          if (pollRef.current) clearInterval(pollRef.current)
          // Clear the trigger from API so it doesn't re-trigger
          fetch("/api/arduino/trigger", { method: "DELETE" }).catch(() => {})
        }
      } catch { /* ignore */ }
    }, 500)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [flight, isSimulation, startCascade])

  // Telemetry degradation tick
  useEffect(() => {
    if (!cascadeStarted) return
    const iv = setInterval(() => {
      tickRef.current += 1
      setTick(tickRef.current)
    }, 800)
    return () => clearInterval(iv)
  }, [cascadeStarted])

  // Waveform animation tick
  useEffect(() => {
    if (!maydayActive) return
    const iv = setInterval(() => setWaveformTick((t) => t + 1), 120)
    return () => clearInterval(iv)
  }, [maydayActive, maydayEnded])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [transcriptLines])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cascadeTimers.current.forEach(clearTimeout)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Computed telemetry
  const altDrop = Math.min(tick * 180, 30000)
  const displayAlt = flight ? Math.max(0, Math.round(flight.altitude - altDrop + (Math.random() - 0.5) * 200)) : 0
  const displaySpd = flight ? Math.max(0, Math.round(flight.speed - tick * 8 + (Math.random() - 0.5) * 30)) : 0
  const displayHdg = flight ? Math.round(((flight.direction + tick * 3 + (Math.random() - 0.5) * 15) + 360) % 360) : 0
  const displayGForce = cascadeStarted ? gForce + (Math.random() - 0.5) * 0.4 : 1.0

  const nominalCid = flight ? `Qm${flight.callsign.replace(/\s/g, "")}Nominal...safe` : ""
  const nftTokenId = flight ? `0x${flight.callsign.replace(/\s/g, "").toLowerCase()}...nft` : ""

  if (!mounted || !flight) return <div className="min-h-screen bg-black" />

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative emergency-scroll">

      {/* Red scan line effect */}
      {cascadeStarted && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="absolute inset-0 bg-red-500/[0.02]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-red-500/30" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-red-500/30" />
        </div>
      )}

      {/* ── Top bar ── */}
      <header className={`relative z-40 border-b px-6 py-4 transition-colors duration-700 ${
        cascadeStarted ? "border-red-500/20 bg-black/95" : "border-white/10 bg-black/90"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[10px] font-mono tracking-wider">BACK</span>
            </button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-3">
              <Plane className={`w-5 h-5 ${cascadeStarted ? "text-red-400" : "text-white/50"}`} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-mono font-bold">{flight.callsign}</h1>
                  {cascadeStarted && (
                    <span className="text-[9px] font-mono text-red-400 bg-red-500/15 px-2 py-0.5 rounded animate-pulse font-bold">
                      EMERGENCY
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-white/35">
                  {flight.airline} — {flight.depIata} → {flight.arrIata} — {flight.aircraft}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!cascadeStarted && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03]">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isSimulation ? "bg-red-400" : "bg-amber-400"}`} />
                <span className={`text-[10px] font-mono ${isSimulation ? "text-red-400/80" : "text-amber-400/80"}`}>
                  {isSimulation ? "SIMULATION" : "AWAITING ARDUINO"}
                </span>
              </div>
            )}
            {cascadeStarted && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/[0.05]">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono text-red-400">ANOMALY ACTIVE</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Three-column layout ── */}
      <div className="relative z-30 grid grid-cols-12 gap-4 p-6 h-[calc(100vh-73px)] overflow-hidden">

        {/* ═══ LEFT: Telemetry ═══ */}
        <div className="col-span-3 flex flex-col gap-4 overflow-y-auto pr-2 emergency-scroll">
          <div className="flex items-center gap-2 mb-1">
            <Activity className={`w-4 h-4 ${cascadeStarted ? "text-red-400" : "text-white/40"}`} />
            <span className={`text-[10px] font-mono tracking-[0.2em] ${cascadeStarted ? "text-red-400/70" : "text-white/40"}`}>
              {cascadeStarted ? "LAST KNOWN TELEMETRY" : "LIVE TELEMETRY"}
            </span>
          </div>

          <BigTelemetry label="ALTITUDE" value={`${displayAlt.toLocaleString()}`} unit="ft" warn={cascadeStarted} critical={displayAlt < 5000 && cascadeStarted} />
          <BigTelemetry label="SPEED" value={`${displaySpd}`} unit="kts" warn={cascadeStarted} />
          <BigTelemetry label="G-FORCE" value={displayGForce.toFixed(2)} unit="G" warn={displayGForce > 1.5} critical={displayGForce > 3.5} />
          <BigTelemetry label="HEADING" value={`${displayHdg}`} unit="°" warn={cascadeStarted} />
          <BigTelemetry
            label="POSITION"
            value={`${flight.currentPos[1].toFixed(4)}°N`}
            unit={`${flight.currentPos[0].toFixed(4)}°E`}
            warn={cascadeStarted}
          />

          {/* Manual trigger fallback — only in Arduino mode */}
          {!cascadeStarted && !isSimulation && (
            <button
              onClick={handleManualTrigger}
              className="mt-auto py-3 rounded-lg border border-red-500/20 bg-red-500/[0.04] hover:bg-red-500/[0.08] hover:border-red-500/30 transition-all duration-300 group"
            >
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-4 h-4 text-red-400/60 group-hover:text-red-400" />
                <span className="text-xs font-mono tracking-wider text-red-400/60 group-hover:text-red-400">
                  MANUAL TRIGGER
                </span>
              </div>
              <span className="block text-[9px] font-mono text-white/15 mt-1 text-center">
                or shake Arduino to trigger automatically
              </span>
            </button>
          )}
        </div>

        {/* ═══ CENTER: Chain of Custody Timeline ═══ */}
        <div className="col-span-5 flex flex-col overflow-y-auto emergency-scroll">
          <div className="flex items-center gap-2 mb-4">
            <Shield className={`w-4 h-4 ${cascadeStarted ? "text-red-400/70" : "text-white/30"}`} />
            <span className={`text-[10px] font-mono tracking-[0.2em] ${cascadeStarted ? "text-red-400/60" : "text-white/30"}`}>
              CHAIN OF CUSTODY — EXECUTION LOG
            </span>
          </div>

          {!cascadeStarted && !isSimulation && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full border border-amber-500/20 bg-amber-500/[0.03] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-400/50" />
                </div>
                <p className="text-sm font-mono text-white/20">
                  AWAITING ARDUINO TRIGGER
                </p>
                <p className="text-[10px] font-mono text-white/10 mt-2 max-w-xs mx-auto leading-relaxed">
                  Shake the Arduino Nano 33 BLE Sense to trigger a catastrophic event.
                  The IMU accelerometer will detect G-force &gt; 3.5G and execute the
                  FlightChain protocol automatically.
                </p>
              </div>
            </div>
          )}

          {cascadeStarted && (
            <div className="relative pl-6 space-y-1 flex-1">
              <div className="absolute left-[11px] top-0 bottom-0 w-px bg-red-500/15" />

              {CRASH_STEPS.map((step) => {
                const fired = events.find((e) => e.id === step.id)
                return (
                  <div
                    key={step.id}
                    className={`relative transition-all duration-500 ${fired ? "opacity-100" : "opacity-20"}`}
                  >
                    <div className="absolute -left-[15px] top-3">
                      <div className={`w-3 h-3 rounded-full border-2 transition-all duration-500 ${
                        fired
                          ? step.id === "crash"
                            ? "border-red-500 bg-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                            : step.id === "mayday"
                              ? "border-red-400 bg-red-400/30 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                              : "border-white/60 bg-white/20"
                          : "border-white/10 bg-transparent"
                      }`} />
                    </div>

                    <div className={`rounded-lg border p-4 mb-3 transition-all duration-700 ${
                      fired
                        ? step.id === "crash"
                          ? "border-red-500/30 bg-red-500/[0.05]"
                          : "border-white/10 bg-white/[0.02]"
                        : "border-white/5 bg-transparent"
                    } ${fired ? "animate-fade-slide-in" : ""}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-mono font-bold tracking-wide ${
                          fired
                            ? step.id === "crash" ? "text-red-400" : "text-white/80"
                            : "text-white/20"
                        }`}>
                          {step.label}
                        </span>
                        {fired && (
                          <span className="text-[9px] font-mono text-white/20">
                            T+{((fired.timestamp - events[0]?.timestamp) / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] font-mono leading-relaxed ${
                        fired ? "text-white/40" : "text-white/10"
                      }`}>
                        {step.detail}
                      </p>
                      {fired && step.id === "crash" && (
                        <div className="mt-2 pt-2 border-t border-red-500/10">
                          <span className="text-[9px] font-mono text-red-400/70">
                            Peak G-force: {gForce.toFixed(2)}G — Threshold: 3.50G
                          </span>
                        </div>
                      )}
                      {fired && step.id === "pinata" && (
                        <div className="mt-2 pt-2 border-t border-white/5">
                          <span className="text-[9px] font-mono text-white/30 break-all">
                            CID: {crashCid}
                          </span>
                        </div>
                      )}
                      {fired && step.id === "nft" && (
                        <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-[9px] font-mono text-white/25">OLD URI</span>
                            <span className="text-[9px] font-mono text-white/20 line-through">ipfs://{nominalCid.slice(0, 22)}...</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[9px] font-mono text-white/25">NEW URI</span>
                            <span className="text-[9px] font-mono text-red-400/60">ipfs://{crashCid.slice(0, 22)}...</span>
                          </div>
                        </div>
                      )}
                      {fired && step.id === "escrow" && (
                        <div className="mt-2 pt-2 border-t border-white/5">
                          <span className="text-[9px] font-mono text-white/30">
                            TX: {txHash} — 100,000 RLUSD → rescue-team.xrpl.wallet
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Blockchain state + Mayday ═══ */}
        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pl-2 emergency-scroll">

          {/* Dynamic NFT */}
          <div>
            <span className={`text-[10px] font-mono tracking-[0.2em] block mb-2 ${
              nftUpdated ? "text-red-400/60" : "text-white/30"
            }`}>
              XRPL DYNAMIC NFT — XLS-46d
            </span>
            <div className={`rounded-lg border p-4 transition-all duration-700 ${
              nftUpdated
                ? "border-red-500/25 bg-red-500/[0.03]"
                : "border-white/8 bg-white/[0.02]"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-white/70">Aircraft Twin</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  nftUpdated ? "text-red-400 bg-red-500/10" : "text-green-400/70 bg-green-400/10"
                }`}>
                  {nftUpdated ? "CRASH" : "NOMINAL"}
                </span>
              </div>
              <div className="space-y-2">
                <Row label="TOKEN ID" value={nftTokenId} />
                <Row label="OWNER" value={`${flight.airline.slice(0, 12).toLowerCase().replace(/\s/g, "-")}.xrpl`} />
                <Row label="DOMAIN" value="airline.permitted.flightchain" />
                <div className="pt-2 mt-2 border-t border-white/5">
                  <Row
                    label="STATUS URI"
                    value={nftUpdated ? `ipfs://${crashCid.slice(0, 18)}...` : `ipfs://${nominalCid.slice(0, 18)}...`}
                    valueColor={nftUpdated ? "text-red-400/70" : "text-white/50"}
                  />
                </div>
                {nftUpdated && (
                  <div className="animate-fade-slide-in">
                    <Row label="PREV URI" value={`ipfs://${nominalCid.slice(0, 18)}...`} valueColor="text-white/15 line-through" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Escrow */}
          <div>
            <span className={`text-[10px] font-mono tracking-[0.2em] block mb-2 ${
              escrowReleased ? "text-red-400/60" : "text-white/30"
            }`}>
              XRPL TOKEN ESCROW — RLUSD
            </span>
            <div className={`rounded-lg border p-4 transition-all duration-700 ${
              escrowReleased
                ? "border-red-500/25 bg-red-500/[0.03]"
                : "border-white/8 bg-white/[0.02]"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {escrowReleased ? (
                    <Unlock className="w-4 h-4 text-red-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-white/30" />
                  )}
                  <span className="text-lg font-mono font-bold text-white">100,000</span>
                  <span className="text-xs font-mono text-white/40">RLUSD</span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  escrowReleased ? "text-red-400 bg-red-500/10" : "text-white/40 bg-white/5"
                }`}>
                  {escrowReleased ? "RELEASED" : "LOCKED"}
                </span>
              </div>
              <div className="space-y-2">
                <Row label="CONDITION" value={escrowReleased ? "Crash cryptographically verified" : "Crash signature required"} />
                <Row label="SOURCE" value={`${flight.airline.slice(0, 10).toLowerCase().replace(/\s/g, "-")}-escrow.xrpl`} />
                <Row label="DESTINATION" value="rescue-sar-team.xrpl.wallet" />
                {escrowReleased && (
                  <div className="animate-fade-slide-in pt-2 mt-2 border-t border-red-500/10">
                    <Row label="TX HASH" value={txHash} valueColor="text-white/40" />
                    <Row label="SETTLED" value={new Date().toISOString().slice(0, 19) + "Z"} valueColor="text-white/30" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* IPFS Payload */}
          <div>
            <button
              onClick={() => setIpfsExpanded(!ipfsExpanded)}
              className="flex items-center justify-between w-full group mb-2"
            >
              <span className={`text-[10px] font-mono tracking-[0.2em] ${
                cascadeStarted ? "text-red-400/60" : "text-white/30"
              }`}>
                PINATA IPFS — TELEMETRY PAYLOAD
              </span>
              {ipfsExpanded
                ? <ChevronUp className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40" />
                : <ChevronDown className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40" />}
            </button>
            <div className={`rounded-lg border overflow-hidden transition-all duration-500 ${
              cascadeStarted ? "border-red-500/15 bg-red-500/[0.02]" : "border-white/8 bg-white/[0.02]"
            }`}>
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-[9px] font-mono text-white/25 break-all">
                  CID: {cascadeStarted ? crashCid : nominalCid}
                </span>
              </div>
              {ipfsExpanded && (
                <div className="p-3 animate-fade-slide-in">
                  <pre className="text-[9px] font-mono text-white/35 leading-relaxed whitespace-pre-wrap">
{JSON.stringify({
  flight: flight.callsign,
  airline: flight.airline,
  route: `${flight.depIata} → ${flight.arrIata}`,
  aircraft: flight.aircraft,
  timestamp: new Date().toISOString(),
  status: cascadeStarted ? "CRASH_DETECTED" : "NOMINAL",
  telemetry: {
    altitude_ft: displayAlt,
    speed_kts: displaySpd,
    heading_deg: displayHdg,
    g_force: Number(displayGForce.toFixed(2)),
    latitude: Number(flight.currentPos[1].toFixed(4)),
    longitude: Number(flight.currentPos[0].toFixed(4)),
  },
  ...(cascadeStarted ? {
    anomaly: {
      type: "CATASTROPHIC_G_FORCE",
      peak_g: Number(gForce.toFixed(2)),
      trigger_threshold: 3.5,
      edge_device: "Arduino Nano 33 BLE Sense",
    },
    evidence: {
      ipfs_cid: crashCid,
      xrpl_nft_id: nftTokenId,
      escrow_tx: escrowReleased ? txHash : null,
    },
  } : {}),
}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* ═══ MAYDAY VOICE AGENT (inline) ═══ */}
          {maydayActive && (
            <div className="animate-fade-slide-in">
              <span className="text-[10px] font-mono tracking-[0.2em] text-red-400/60 block mb-2">
                AI VOICE AGENT — ELEVENLABS + MCP
              </span>
              <div className="rounded-lg border border-red-500/25 bg-red-500/[0.03] overflow-hidden animate-pulse-red">
                {/* Header */}
                <div className="flex items-center gap-3 px-3 py-2 border-b border-red-500/10 bg-red-500/[0.03]">
                  <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span className="text-[9px] font-mono tracking-[0.15em] text-red-400 font-semibold">
                    MAYDAY — {flight.callsign}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    {isMicActive ? (
                      <Mic className="w-3 h-3 text-red-400 animate-pulse" />
                    ) : isAgentSpeaking ? (
                      <Mic className="w-3 h-3 text-green-400 animate-pulse" />
                    ) : conversationActive ? (
                      <Mic className="w-3 h-3 text-green-400" />
                    ) : (
                      <MicOff className="w-3 h-3 text-white/20" />
                    )}
                    <span className="text-[8px] font-mono text-white/25">
                      {isMicActive ? "LISTENING" : isAgentSpeaking ? "SPEAKING" : conversationActive ? "READY" : "CONNECTING"}
                    </span>
                  </div>
                </div>

                {/* Waveform */}
                <div className="flex items-center justify-center gap-[2px] h-8 px-3 bg-black/40">
                  {Array.from({ length: 36 }).map((_, i) => {
                    const phase = waveformTick * 0.3 + i * 0.35
                    const h = !conversationActive || !isAgentSpeaking
                      ? 10
                      : Math.max(10, 70 * (0.3 + 0.7 * Math.abs(Math.sin(phase))))
                    return (
                      <div
                        key={i}
                        className="w-[2px] rounded-full"
                        style={{
                          height: `${h}%`,
                          backgroundColor: !conversationActive || !isAgentSpeaking
                            ? "rgba(255,255,255,0.06)"
                            : `rgba(239, 68, 68, ${0.2 + 0.4 * Math.abs(Math.sin(phase))})`,
                          transition: "height 100ms ease-out",
                        }}
                      />
                    )
                  })}
                </div>

                {/* Transcript */}
                <div className="max-h-32 overflow-y-auto px-3 py-2 space-y-1 emergency-scroll">
                  {transcriptLines.map((line, i) => {
                    const isAgent = line.startsWith("[AGENT]")
                    const isTower = line.startsWith("[RADIO TOWER]")
                    return (
                      <p
                        key={i}
                        className="text-[10px] font-mono leading-relaxed animate-fade-slide-in"
                        style={{ 
                          color: isAgent 
                            ? "rgba(239,68,68,0.85)" 
                            : isTower 
                              ? "rgba(59,130,246,0.85)" 
                              : "rgba(255,255,255,0.35)" 
                        }}
                      >
                        {line}
                      </p>
                    )
                  })}
                  {transcriptLines.length === 0 && (
                    <p className="text-[10px] font-mono text-white/15">Initiating voice agent...</p>
                  )}
                  {isAgentSpeaking && (
                    <p className="text-[10px] font-mono text-red-400/60 animate-pulse">Agent responding...</p>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
                
                {/* Quick Action Buttons */}
                {conversationActive && !maydayEnded && (
                  <div className="border-t border-red-500/10 px-2 pt-2 pb-1 bg-black/20">
                    <div className="flex flex-wrap gap-1 mb-2">
                      <button
                        onClick={() => setUserMessage("What's the current status?")}
                        className="px-2 py-0.5 text-[9px] font-mono bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 hover:bg-blue-500/20 transition-all"
                      >
                        📊 Status
                      </button>
                      <button
                        onClick={() => setUserMessage("Tell me about the sensors")}
                        className="px-2 py-0.5 text-[9px] font-mono bg-purple-500/10 border border-purple-500/20 rounded text-purple-400 hover:bg-purple-500/20 transition-all"
                      >
                        🔧 Sensors
                      </button>
                      <button
                        onClick={() => setUserMessage("Show me the IPFS proof")}
                        className="px-2 py-0.5 text-[9px] font-mono bg-green-500/10 border border-green-500/20 rounded text-green-400 hover:bg-green-500/20 transition-all"
                      >
                        🗄️ IPFS
                      </button>
                      <button
                        onClick={() => setUserMessage("Verify blockchain transaction")}
                        className="px-2 py-0.5 text-[9px] font-mono bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 hover:bg-yellow-500/20 transition-all"
                      >
                        ⛓️ Blockchain
                      </button>
                      <button
                        onClick={() => setUserMessage("What's the escrow status?")}
                        className="px-2 py-0.5 text-[9px] font-mono bg-orange-500/10 border border-orange-500/20 rounded text-orange-400 hover:bg-orange-500/20 transition-all"
                      >
                        💰 Escrow
                      </button>
                      <button
                        onClick={() => setUserMessage("Coordinate rescue operations")}
                        className="px-2 py-0.5 text-[9px] font-mono bg-red-500/10 border border-red-500/20 rounded text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        🚁 Rescue
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Radio Tower Input */}
                {conversationActive && !maydayEnded && (
                  <div className="border-t border-red-500/10 p-2 bg-black/20">
                    <div className="flex gap-2">
                      <button
                        onClick={handleToggleMicrophone}
                        disabled={isAgentSpeaking}
                        className={`px-2 py-1 rounded border transition-all ${
                          isMicActive 
                            ? "bg-red-500/30 border-red-500/50 text-red-400 animate-pulse" 
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                        title={isMicActive ? "Stop microphone" : "Start microphone - speak to agent"}
                      >
                        {isMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </button>
                      <input
                        type="text"
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type as radio tower..."
                        disabled={isAgentSpeaking || isMicActive}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 disabled:opacity-50"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!userMessage.trim() || isAgentSpeaking || isMicActive}
                        className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded text-[10px] font-mono text-blue-400 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        SEND
                      </button>
                    </div>
                    <p className="text-[8px] font-mono text-white/20 mt-1 px-1">
                      {isMicActive ? "🎤 Microphone active - Agent listening..." : "Type or click microphone to speak"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Back to Dashboard */}
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-auto py-2.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300"
          >
            <div className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5 text-white/40" />
              <span className="text-[11px] font-mono tracking-wider text-white/40">
                RETURN TO FLIGHT TRACKER
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function BigTelemetry({
  label, value, unit, warn = false, critical = false,
}: {
  label: string; value: string; unit: string; warn?: boolean; critical?: boolean;
}) {
  const borderClass = critical
    ? "border-red-500/30 bg-red-500/[0.06]"
    : warn
      ? "border-red-500/15 bg-red-500/[0.03]"
      : "border-white/8 bg-white/[0.02]"

  return (
    <div className={`rounded-lg border p-4 transition-all duration-500 ${borderClass}`}>
      <span className="text-[9px] font-mono text-white/30 block mb-1">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-mono font-bold tabular-nums ${
          critical ? "text-red-400" : warn ? "text-red-300/80" : "text-white"
        }`}>
          {value}
        </span>
        <span className={`text-xs font-mono ${
          critical ? "text-red-400/60" : warn ? "text-red-300/50" : "text-white/30"
        }`}>
          {unit}
        </span>
      </div>
      {critical && <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-1" />}
    </div>
  )
}

function Row({
  label, value, valueColor = "text-white/50",
}: {
  label: string; value: string; valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-mono text-white/30">{label}</span>
      <span className={`text-[10px] font-mono ${valueColor} max-w-[200px] truncate text-right`}>{value}</span>
    </div>
  )
}
