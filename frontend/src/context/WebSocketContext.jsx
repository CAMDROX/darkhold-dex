import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { tokenStorage } from '../services/api'
import toast from 'react-hot-toast'

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const { user, refreshUser } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const subscribersRef = useRef(new Map())

  const getWsUrl = () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080'
    const wsProto = apiBase.startsWith('https') ? 'wss' : 'ws'
    const host = apiBase.replace(/^https?:\/\//, '')
    const token = tokenStorage.getAccessToken()
    return `${wsProto}://${host}/ws${token ? `?token=${token}` : ''}`
  }

  // Subscribe callback to specific event types
  const subscribe = useCallback((eventType, callback) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set())
    }
    subscribersRef.current.get(eventType).add(callback)

    return () => {
      const set = subscribersRef.current.get(eventType)
      if (set) {
        set.delete(callback)
        if (set.size === 0) {
          subscribersRef.current.delete(eventType)
        }
      }
    }
  }, [])

  // Send an action over the socket (e.g. subscribe to topic)
  const sendAction = useCallback((action, topic = '') => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, topic }))
    }
  }, [])

  const connect = useCallback(() => {
    // Clean up existing socket if any
    if (socketRef.current) {
      socketRef.current.close()
    }

    try {
      const wsUrl = getWsUrl()
      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        console.log('⚡ [WebSocket] Connected to Darkhold Real-Time Hub')
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          setLastMessage(msg)

          // Disseminate to registered event listeners (support msg.event, msg.type, msg.data.type)
          const matchedEvents = new Set([msg.event, msg.type, msg.data?.type, msg.data?.event].filter(Boolean))
          matchedEvents.forEach((evtName) => {
            if (subscribersRef.current.has(evtName)) {
              subscribersRef.current.get(evtName).forEach((cb) => {
                try {
                  cb(msg.data || msg, msg)
                } catch (err) {
                  console.error('[WebSocket Callback Error]:', err)
                }
              })
            }
          })

          // Global Handlers
          if (msg.event === 'KYC_STATUS_UPDATED') {
            const data = msg.data
            if (user && data.user_id === user.id) {
              if (data.kyc_status === 'verified') {
                toast.success('🎉 Identity Verified! Full dark pool & escrow trading privileges unlocked.', {
                  icon: '🛡️',
                  duration: 6000,
                })
              } else if (data.kyc_status === 'unverified') {
                toast.error(`⚠️ Verification Update: ${data.rejection_reason || 'Document could not be verified.'}`, {
                  duration: 7000,
                })
              }
              refreshUser()
            }
          }
        } catch (err) {
          console.warn('[WebSocket Parse Warning]:', err)
        }
      }

      ws.onclose = (e) => {
        setIsConnected(false)
        socketRef.current = null

        // Reconnect with exponential backoff if not closed deliberately
        if (e.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 [WebSocket] Reconnecting to hub...')
            connect()
          }, 3000)
        }
      }

      ws.onerror = (err) => {
        console.warn('⚠️  [WebSocket Error]:', err)
        ws.close()
      }
    } catch (err) {
      console.warn('⚠️  [WebSocket Connection Exception]:', err)
    }
  }, [user?.id, refreshUser])

  // Establish connection on mount or user change
  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component Unmounting')
      }
    }
  }, [connect])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        lastMessage,
        subscribe,
        sendAction,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => useContext(WebSocketContext)
