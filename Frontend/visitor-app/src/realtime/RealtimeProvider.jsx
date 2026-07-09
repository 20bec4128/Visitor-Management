import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

import { getApiBase } from '../api/base.js'
import { getAuthToken, isLoggedIn } from '../auth/authStorage.js'

// Note: sockjs-client references a Node-style `global`; it's aliased to globalThis via vite.config.js `define`.

const RealtimeContext = createContext(null)

export function useRealtime() {
  return useContext(RealtimeContext)
}

/**
 * Single STOMP-over-WebSocket connection for the whole logged-in session. Mounted above the router
 * so it persists across navigation. Consumers register subscriptions via `subscribe`, which are
 * (re)established automatically on every (re)connect.
 */
export function RealtimeProvider({ children }) {
  const location = useLocation()
  const clientRef = useRef(null)
  const subsRef = useRef(new Map()) // id -> { destination, callback, sub }
  const idRef = useRef(0)
  const [connected, setConnected] = useState(false)

  const bindSubscription = useCallback((client, entry) => {
    entry.sub = client.subscribe(entry.destination, (frame) => {
      let data = frame.body
      try {
        data = JSON.parse(frame.body)
      } catch {
        // keep raw string
      }
      entry.callback(data, frame)
    })
  }, [])

  const activate = useCallback(() => {
    if (clientRef.current) return
    const client = new Client({
      webSocketFactory: () => new SockJS(`${getApiBase()}/ws`),
      connectHeaders: { Authorization: `Bearer ${getAuthToken()}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true)
        subsRef.current.forEach((entry) => bindSubscription(client, entry))
      },
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    })
    clientRef.current = client
    client.activate()
  }, [bindSubscription])

  const deactivate = useCallback(() => {
    const client = clientRef.current
    if (!client) return
    subsRef.current.forEach((entry) => {
      try {
        entry.sub?.unsubscribe()
      } catch {
        // ignore
      }
      entry.sub = null
    })
    client.deactivate()
    clientRef.current = null
    setConnected(false)
  }, [])

  // Connect when logged in; reconnect handled by stompjs. Re-checked on navigation so login/logout
  // transitions are picked up without a full reload.
  useEffect(() => {
    if (isLoggedIn()) activate()
    else deactivate()
  }, [location.pathname, activate, deactivate])

  // Tear down the socket when the whole app unmounts.
  useEffect(() => () => deactivate(), [deactivate])

  const subscribe = useCallback((destination, callback) => {
    const id = ++idRef.current
    const entry = { destination, callback, sub: null }
    subsRef.current.set(id, entry)
    const client = clientRef.current
    if (client && client.connected) bindSubscription(client, entry)
    return () => {
      const e = subsRef.current.get(id)
      if (!e) return
      try {
        e.sub?.unsubscribe()
      } catch {
        // ignore
      }
      subsRef.current.delete(id)
    }
  }, [bindSubscription])

  const publish = useCallback((destination, body) => {
    const client = clientRef.current
    if (client && client.connected) {
      client.publish({ destination, body: JSON.stringify(body) })
      return true
    }
    return false
  }, [])

  return (
    <RealtimeContext.Provider value={{ connected, subscribe, publish }}>
      {children}
    </RealtimeContext.Provider>
  )
}
