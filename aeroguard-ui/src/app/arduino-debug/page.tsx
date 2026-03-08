"use client"

import { useState, useEffect } from "react"
import { Activity, Zap } from "lucide-react"

export default function ArduinoDebugPage() {
  const [gForce, setGForce] = useState(0)
  const [temp, setTemp] = useState(0)
  const [humidity, setHumidity] = useState(0)
  const [lastUpdate, setLastUpdate] = useState("")
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/arduino/status")
        const data = await res.json()
        
        if (data.lastUpdate) {
          setGForce(data.gForce)
          setTemp(data.temp)
          setHumidity(data.humidity)
          setLastUpdate(data.lastUpdate)
          setConnected(true)
        } else {
          setConnected(false)
        }
      } catch {
        setConnected(false)
      }
    }, 100) // Update 10x per second

    return () => clearInterval(interval)
  }, [])

  const gForcePercent = Math.min((gForce / 5) * 100, 100)
  const isHigh = gForce > 2.5
  const isCrash = gForce > 3.5

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-mono mb-2">Arduino Debug Monitor</h1>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-mono text-white/60">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* G-Force Display */}
        <div className="mb-8 p-6 border border-white/20 rounded-lg bg-white/5">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6" />
            <h2 className="text-2xl font-mono">G-Force</h2>
          </div>
          
          <div className="mb-4">
            <div className={`text-6xl font-mono ${isCrash ? 'text-red-500' : isHigh ? 'text-yellow-500' : 'text-green-500'}`}>
              {gForce.toFixed(2)}G
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4 h-8 bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-100 ${isCrash ? 'bg-red-500' : isHigh ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${gForcePercent}%` }}
            />
          </div>

          {/* Threshold Markers */}
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-white/60">Normal (0-2.5G)</span>
              <span className={gForce <= 2.5 ? 'text-green-500' : 'text-white/30'}>✓</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Turbulence (2.5-3.5G)</span>
              <span className={gForce > 2.5 && gForce <= 3.5 ? 'text-yellow-500' : 'text-white/30'}>
                {gForce > 2.5 && gForce <= 3.5 ? '⚠' : '○'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">CRASH (&gt;3.5G)</span>
              <span className={gForce > 3.5 ? 'text-red-500' : 'text-white/30'}>
                {gForce > 3.5 ? '🚨' : '○'}
              </span>
            </div>
          </div>

          {isCrash && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg animate-pulse">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-red-500" />
                <span className="font-mono text-red-500">CRASH THRESHOLD EXCEEDED!</span>
              </div>
            </div>
          )}
        </div>

        {/* Other Telemetry */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 border border-white/20 rounded-lg bg-white/5">
            <div className="text-sm font-mono text-white/60 mb-1">Temperature</div>
            <div className="text-3xl font-mono">{temp.toFixed(1)}°C</div>
          </div>
          <div className="p-4 border border-white/20 rounded-lg bg-white/5">
            <div className="text-sm font-mono text-white/60 mb-1">Humidity</div>
            <div className="text-3xl font-mono">{humidity.toFixed(1)}%</div>
          </div>
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div className="text-xs font-mono text-white/40">
            Last update: {new Date(lastUpdate).toLocaleTimeString()}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 border border-white/10 rounded-lg bg-white/5">
          <h3 className="font-mono text-lg mb-2">Instructions</h3>
          <ol className="text-sm font-mono text-white/70 space-y-1 list-decimal list-inside">
            <li>Make sure bridge.py is running</li>
            <li>Shake the Arduino to see G-force values change</li>
            <li>Values above 3.5G will trigger a crash event</li>
            <li>Go to Emergency page to see the crash cascade</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
