"use client"

/**
 * ElevenLabs Conversational AI Client using official SDK
 * Enables real-time speech-to-speech conversation with agent
 */

import { Conversation } from '@elevenlabs/client'

export interface ConversationConfig {
  agentId: string
  flightContext?: any  // Flight data to pass to agent
  onAgentResponse?: (text: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: string) => void
  onModeChange?: (mode: 'speaking' | 'listening' | 'idle') => void
}

export class ElevenLabsConversation {
  private conversation: Conversation | null = null
  private config: ConversationConfig
  private microphoneStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private silenceNode: AudioWorkletNode | null = null

  constructor(config: ConversationConfig) {
    this.config = config
  }

  // Send silent audio to keep connection alive
  private startSilentAudio() {
    try {
      if (!this.microphoneStream) return
      
      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream)
      
      // Keep audio context alive by connecting to destination
      source.connect(this.audioContext.destination)
      
      console.log('✅ Silent audio stream connected to keep WebSocket alive')
    } catch (error) {
      console.error('❌ Failed to start silent audio:', error)
    }
  }

  private stopSilentAudio() {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }

  async connect() {
    try {
      console.log('🔌 Step 1: Getting connection mode from backend...')
      
      // Get signed URL from our backend with flight context
      const response = await fetch('/api/elevenlabs/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightContext: this.config.flightContext || {}
        })
      })

      const payload = await response.json().catch(() => ({}))
      if (payload?.mock) {
        throw new Error(`MOCK_MODE:${payload.message || payload.reason || 'Voice service unavailable'}`)
      }

      if (!response.ok) {
        throw new Error(payload.error || `Connection failed: ${response.status}`)
      }

      const signedUrl = payload.signed_url

      console.log('🔌 Step 2: Requesting microphone permission...')
      try {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        console.log('✓ Microphone permission granted')
        this.startSilentAudio()
      } catch (micError: any) {
        console.error('❌ Microphone permission denied:', micError)
        throw new Error('Microphone access required. Please allow microphone permission in your browser.')
      }

      console.log('🔌 Step 3: Starting ElevenLabs conversation...')

      // Create conversation instance with official SDK
      // Pass client config to use our pre-authorized microphone stream
      const sessionConfig: any = {
        signedUrl,
        // Configure client to use microphone we already have permission for
        clientOptions: {
          audio: {
            input: {
              stream: this.microphoneStream
            }
          }
        },
        onConnect: () => {
          console.log('✅ ElevenLabs WebSocket connected with active audio stream')
          this.config.onConnect?.()
        },
        onDisconnect: () => {
          console.log('⚠️ ElevenLabs WebSocket disconnected')
          // Clean up audio resources
          this.stopSilentAudio()
          if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach(track => track.stop())
            this.microphoneStream = null
          }
          this.config.onDisconnect?.()
        },
        onError: (error: any) => {
          console.error('❌ ElevenLabs error:', error)
          const errorMsg = typeof error === 'string' ? error : error?.message || 'Connection error'
          this.config.onError?.(errorMsg)
        },
        onMessage: (message: any) => {
          console.log('📨 Message from agent:', message)
          
          // Handle different message types
          if (message?.type === 'agent_response' && message?.text) {
            this.config.onAgentResponse?.(message.text)
          }
        },
        onModeChange: (mode: any) => {
          const modeValue = mode?.mode || mode
          console.log('🔄 Mode changed:', modeValue)
          if (modeValue) {
            this.config.onModeChange?.(modeValue as 'speaking' | 'listening' | 'idle')
          }
        }
      }

      // Start the session with our configuration
      this.conversation = await Conversation.startSession(sessionConfig)

      console.log('✅ Conversation session started')
      return this.conversation

    } catch (error: any) {
      console.error('❌ Connection failed:', error)
      // Clean up resources if connection failed
      this.stopSilentAudio()
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop())
        this.microphoneStream = null
      }
      this.config.onError?.(error?.message || 'Failed to connect')
      throw error
    }
  }

  async sendText(text: string) {
    if (!this.conversation) {
      throw new Error('Not connected')
    }

    console.log('📤 Sending text:', text)
    // SDK v0.15.0 uses sendText method
    if (typeof (this.conversation as any).sendText === 'function') {
      await (this.conversation as any).sendText(text)
    } else {
      console.warn('⚠ sendText method not found on conversation object')
    }
  }

  async startMicrophone() {
    if (!this.conversation) {
      throw new Error('Not connected')
    }

    try {
      console.log('🎤 Starting microphone input...')
      
      // The SDK should already be using the microphone from getUserMedia
      // But we can explicitly tell it to start recording if needed
      if (typeof (this.conversation as any).startRecording === 'function') {
        await (this.conversation as any).startRecording()
        console.log('✓ Recording started')
      }
      
      return () => this.stopMicrophone()
    } catch (error: any) {
      console.error('❌ Microphone start error:', error)
      throw error
    }
  }

  async stopMicrophone() {
    if (this.conversation) {
      console.log('🔇 Stopping microphone...')
      if (typeof (this.conversation as any).stopRecording === 'function') {
        await (this.conversation as any).stopRecording()
      }
    }
  }

  async disconnect() {
    console.log('🔌 Disconnecting conversation...')
    
    // Stop silent audio
    this.stopSilentAudio()
    
    // Stop microphone stream
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop())
      this.microphoneStream = null
      console.log('✓ Microphone stream stopped')
    }
    
    // End ElevenLabs session
    if (this.conversation) {
      if (typeof (this.conversation as any).endSession === 'function') {
        await (this.conversation as any).endSession()
      }
      this.conversation = null
      console.log('✓ Session ended')
    }
  }
}
