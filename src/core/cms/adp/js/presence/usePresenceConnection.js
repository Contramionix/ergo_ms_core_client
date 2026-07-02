import tokenService from '@/core/cms/js/tokenService'
import { openAuthenticatedWebSocket } from '@/js/ws/authenticatedWebSocket.js'

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]
const MAX_RECONNECT_ATTEMPTS = 10
const PING_INTERVAL_MS = 45000

let wsConnection = null
let reconnectTimer = null
let pingTimer = null
let reconnectAttempt = 0
let intentionalClose = false
let connectionPromise = null

function clearPingTimer() {
  if (pingTimer) {
    clearInterval(pingTimer)
    pingTimer = null
  }
}

function startPingTimer() {
  clearPingTimer()
  pingTimer = setInterval(() => {
    const socket = wsConnection?.getSocket()
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ type: 'ping' }))
      } catch {
        // ignore
      }
    }
  }, PING_INTERVAL_MS)
}

function scheduleReconnect() {
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    return
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
  }

  const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)]
  reconnectAttempt += 1
  reconnectTimer = setTimeout(openSocket, delay)
}

function openSocket() {
  if (!tokenService.getAccess()) {
    return
  }

  wsConnection?.close()
  intentionalClose = false
  const openedAt = Date.now()

  wsConnection = openAuthenticatedWebSocket('/ws/presence/', {
    onAuthenticated: () => {
      reconnectAttempt = 0
      startPingTimer()
    },
    onClose: (_event, wasIntentional) => {
      clearPingTimer()
      wsConnection = null
      const elapsed = Date.now() - openedAt
      if (!wasIntentional && !intentionalClose && elapsed > 500) {
        scheduleReconnect()
      }
    },
    onError: () => {
      clearPingTimer()
    },
  })
}

export function ensurePresenceConnected() {
  if (!tokenService.getAccess()) {
    return Promise.resolve()
  }

  if (wsConnection?.isAuthenticated()) {
    return Promise.resolve()
  }

  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = Promise.resolve().finally(() => {
    openSocket()
    connectionPromise = null
  })

  return connectionPromise
}

export function disconnectPresenceConnection() {
  intentionalClose = true

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  clearPingTimer()
  wsConnection?.close()
  wsConnection = null
  reconnectAttempt = 0
}

export function resetPresenceConnection() {
  disconnectPresenceConnection()
}
