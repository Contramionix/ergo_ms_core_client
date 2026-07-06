import tokenService from '@/core/cms/js/tokenService'
import { connectPresenceTransport } from '@/js/realtime/presenceTransport.js'
import {
  PRESENCE_PING_EVENT,
  PRESENCE_USER_TOPIC,
  buildClientEnvelope,
} from '@/js/realtime/envelope.js'

const PING_INTERVAL_MS = 45000

let wsConnection = null
let pingTimer = null
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
        socket.send(JSON.stringify(
          buildClientEnvelope(PRESENCE_PING_EVENT, {}, PRESENCE_USER_TOPIC),
        ))
      } catch {
        // ignore
      }
    }
  }, PING_INTERVAL_MS)
}

function openSocket() {
  if (!tokenService.getAccess()) {
    return
  }

  if (wsConnection && !intentionalClose) {
    return
  }

  intentionalClose = false
  wsConnection?.close()

  wsConnection = connectPresenceTransport({
    onAuthenticated: () => {
      startPingTimer()
    },
    onClose: (_event, wasIntentional) => {
      clearPingTimer()
      if (wasIntentional || intentionalClose) {
        wsConnection = null
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

  if (wsConnection && !intentionalClose) {
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
  clearPingTimer()
  wsConnection?.close()
  wsConnection = null
}

export function resetPresenceConnection() {
  disconnectPresenceConnection()
}
