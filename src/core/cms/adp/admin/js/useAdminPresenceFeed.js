import { ref } from 'vue'

import tokenService from '@/core/cms/js/tokenService'
import { buildWebSocketUrl } from '@/js/api/baseUrl.js'
import { mergeSnapshot } from '@/core/cms/adp/js/presence/presenceStore.js'

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000]
const MAX_RECONNECT_ATTEMPTS = 10

let socket = null
let reconnectTimer = null
let reconnectAttempt = 0
let intentionalClose = false

const connected = ref(false)

function buildWsUrl() {
  const token = tokenService.getAccess()
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return buildWebSocketUrl(`/ws/presence/admin/${query}`)
}

function handleSocketMessage(event) {
  try {
    const data = JSON.parse(event.data)
    if (data?.type === 'presence_snapshot') {
      mergeSnapshot(data.users)
    }
  } catch {
    // ignore parse errors
  }
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
      connected.value = true
      reconnectAttempt = 0
    }

    socket.onmessage = handleSocketMessage
    socket.onclose = () => {
      connected.value = false
      socket = null
      const elapsed = Date.now() - openedAt
      if (!intentionalClose && elapsed > 500) {
        scheduleReconnect()
      }
    }

    socket.onerror = () => {
      connected.value = false
    }
  } catch {
    connected.value = false
    scheduleReconnect()
  }
}

export function connectAdminPresenceFeed() {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
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

  if (socket) {
    try {
      socket.close()
    } catch {
      // ignore
    }
    socket = null
  }

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
