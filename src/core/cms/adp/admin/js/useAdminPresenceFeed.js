import { ref } from 'vue'

import tokenService from '@/core/cms/js/tokenService'
import { connectAdminPresenceTransport } from '@/js/realtime/adminPresenceTransport.js'

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]
const MAX_RECONNECT_ATTEMPTS = 10

let wsConnection = null
let reconnectTimer = null
let reconnectAttempt = 0
let intentionalClose = false

const connected = ref(false)

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

  wsConnection = connectAdminPresenceTransport({
    onAuthenticated: () => {
      connected.value = true
      reconnectAttempt = 0
    },
    onClose: (_event, wasIntentional) => {
      connected.value = false
      wsConnection = null
      const elapsed = Date.now() - openedAt
      if (!wasIntentional && !intentionalClose && elapsed > 500) {
        scheduleReconnect()
      }
    },
    onError: () => {
      connected.value = false
    },
  })
}

export function connectAdminPresenceFeed() {
  if (wsConnection?.isAuthenticated()) {
    return
  }
  const socket = wsConnection?.getSocket()
  if (socket?.readyState === WebSocket.CONNECTING) {
    return
  }
  openSocket()
}

export function disconnectAdminPresenceFeed() {
  intentionalClose = true

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  wsConnection?.close()
  wsConnection = null
  connected.value = false
  reconnectAttempt = 0
}

export function useAdminPresenceFeed() {
  return {
    connected,
    connect: connectAdminPresenceFeed,
    disconnect: disconnectAdminPresenceFeed,
  }
}

export default useAdminPresenceFeed
