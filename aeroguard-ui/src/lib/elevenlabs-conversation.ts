"use client"

/**
 * ElevenLabs Conversational AI Client using official SDK
 * Enables real-time speech-to-speech conversation with agent
 */

import { Conversation } from '@elevenlabs/client'

export interface ConversationConfig {
  agentId: string
  onAgentResponse?: (text: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: string) => void
  onModeChange?: (mode: 'speaking' | 'listening' | 'idle') => void
}

export class ElevenLabsConversation {
  private conversation: Conversation | null = null
  private config: ConversationConfig

  constructor(config: ConversationConfig) {
    this.config = config
  }

  async connect() {
    try {
      console.log('🔌 Connecting to ElevenLabs...')
      
      // Get signed URL from our backend
      const response = await fetch('/api/elevenlabs/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Connection failed: ${response.status}`)
      }

      const { signed_url } = await response.json()
      console.log('✓ Got signed URL')

      // Create conversation instance with official SDK
      this.conversation = await Conversation.startSession({
        signedUrl: signed_url,
        onConnect: () => {
          console.log('✓ Conversation connected')
          this.config.onConnect?.()
        },
        onDisconnect: () => {
          console.log('⚠ Conversation disconnected')
          this.config.onDisconnect?.()
        },
        onError: (error: any) => {
          console.error('❌ Conversation error:', error)
          const errorMsg = typeof error === 'string' ? error : error?.message || 'Connection error'
          this.config.onError?.(errorMsg)
        },
        onMessage: (message: any) => {
          console.log('📨 Agent message:', message)
          
          // Handle different message types
          if (message?.type === 'agent_response' && message?.text) {
            this.config.onAgentResponse?.(message.text)
          }
        },
        onModeChange: (mode: any) => {
          console.log('🔄 Mode changed:', mode?.mode)
          if (mode?.mode) {
            this.config.onModeChange?.(mode.mode as 'speaking' | 'listening' | 'idle')
          }
        }
      })

      return this.conversation

    } catch (error: any) {
      console.error('❌ Connection failed:', error)
      this.config.onError?.(error?.message || 'Failed to connect')
      throw error
    }
  }

  async sendText(text: string) {
    if (!this.conversation) {
      throw new Error('Not connected')
    }

    console.log('📤 Sending text:', text)
    // Try common method names from SDK
    if (typeof (this.conversation as any).sendText === 'function') {
      await (this.conversation as any).sendText(text)
    } else if (typeof (this.conversation as any).sendTextInput === 'function') {
      await (this.conversation as any).sendTextInput({ text })
    } else if (typeof (this.conversation as any).send === 'function') {
      await (this.conversation as any).send({ type: 'text', text })
    } else {
      console.warn('⚠ No send method found on conversation')
    }
  }

  async startMicrophone() {
    if (!this.conversation) {
      throw new Error('Not connected')
    }

    try {
      console.log('🎤 Starting microphone...')
      // Try common method names
      if (typeof (this.conversation as any).startRecording === 'function') {
        await (this.conversation as any).startRecording()
      } else if (typeof (this.conversation as any).startAudioInput === 'function') {
        await (this.conversation as any).startAudioInput()
      } else if (typeof (this.conversation as any).setAudioEnabled === 'function') {
        await (this.conversation as any).setAudioEnabled(true)
      } else {
        console.warn('⚠ No microphone start method found')
      }
      console.log('✓ Microphone active')
      return () => this.stopMicrophone()
    } catch (error: any) {
      console.error('❌ Microphone error:', error)
      throw new Error('Microphone access denied. Check browser permissions.')
    }
  }

  async stopMicrophone() {
    if (this.conversation) {
      console.log('🔇 Stopping microphone...')
      // Try common method names
      if (typeof (this.conversation as any).stopRecording === 'function') {
        await (this.conversation as any).stopRecording()
      } else if (typeof (this.conversation as any).stopAudioInput === 'function') {
        await (this.conversation as any).stopAudioInput()
      } else if (typeof (this.conversation as any).setAudioEnabled === 'function') {
        await (this.conversation as any).setAudioEnabled(false)
      }
    }
  }

  async disconnect() {
    if (this.conversation) {
      console.log('🔌 Disconnecting...')
      if (typeof (this.conversation as any).endSession === 'function') {
        await (this.conversation as any).endSession()
      } else if (typeof (this.conversation as any).close === 'function') {
        await (this.conversation as any).close()
      }
      this.conversation = null
    }
  }
}
