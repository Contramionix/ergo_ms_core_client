import tokenService from '@/core/cms/js/tokenService'
import { buildWebSocketUrl } from '@/js/api/baseUrl.js'

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]
const MAX_RECONNECT_ATTEMPTS = 10
const PING_INTERVAL_MS = 45000

let socket = null
let reconnectTimer = null
let pingTimer = null
let reconnectAttempt = 0
let intentionalClose = false
let connectionPromise = null

function buildWsUrl() {
  const token = tokenService.getAccess()
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return buildWebSocketUrl(`/ws/presence/${query}`)
}

function clearPingTimer() {
  if (pingTimer) {
    clearInterval(pingTimer)
    pingTimer = null
  }
}

function startPingTimer() {
  clearPingTimer()
  pingTimer = setInterval(() => {
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

  try {
    intentionalClose = false
    socket = new WebSocket(buildWsUrl())
    const openedAt = Date.now()

    socket.onopen = () => {
      reconnectAttempt = 0
      startPingTimer()
    }

    socket.onclose = () => {
      clearPingTimer()
      socket = null
      const elapsed = Date.now() - openedAt
      if (!intentionalClose && elapsed > 500) {
        scheduleReconnect()
      }
    }

    socket.onerror = () => {
      clearPingTimer()
    }
  } catch {
    scheduleReconnect()
  }
}

export function ensurePresenceConnected() {
  if (!tokenService.getAccess()) {
    return Promise.resolve()
  }

  if (socket?.readyState === WebSocket.OPEN) {
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

  if (socket) {
    try {
      socket.close()
    } catch {
      // ignore
    }
    socket = null
  }

  reconnectAttempt = 0
}

export function resetPresenceConnection() {
  disconnectPresenceConnection()
}
