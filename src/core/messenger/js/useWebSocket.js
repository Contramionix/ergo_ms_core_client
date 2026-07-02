import { ref, onUnmounted } from 'vue'
import { buildWebSocketUrl } from '@/js/api/baseUrl.js'
import { isHttpPollingMode } from '@/js/realtime/config.js'

const RECONNECT_DELAYS = [1000, 2000, 4000]
const MAX_RECONNECT_ATTEMPTS = 3

export function useWebSocket() {
  const socket = ref(null)
  const connected = ref(false)

  let reconnectAttempt = 0
  let reconnectTimer = null
  let currentUrl = null
  let messageHandler = null
  let intentionalClose = false

  function buildWsUrl(contentType, objectId) {
    return buildWebSocketUrl(`/ws/messenger/${contentType}/${objectId}/`)
  }

  function connect(contentType, objectId, onMessage) {
    disconnect()
    messageHandler = onMessage

    if (isHttpPollingMode()) {
      connected.value = false
      return
    }

    intentionalClose = false
    currentUrl = buildWsUrl(contentType, objectId)
    _open()
  }

  function _open() {
    if (!currentUrl) return
    try {
      const openedAt = Date.now()
      socket.value = new WebSocket(currentUrl)

      socket.value.onopen = () => {
        connected.value = true
        reconnectAttempt = 0
      }

      socket.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (messageHandler) messageHandler(data)
        } catch { /* ignore parse errors */ }
      }

      socket.value.onclose = () => {
        connected.value = false
        const elapsed = Date.now() - openedAt
        if (!intentionalClose && elapsed > 500) _scheduleReconnect()
      }

      socket.value.onerror = () => {
        connected.value = false
      }
    } catch {
      connected.value = false
    }
  }

  function _scheduleReconnect() {
    if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) return
    if (reconnectTimer) clearTimeout(reconnectTimer)
    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt, RECONNECT_DELAYS.length - 1)]
    reconnectAttempt++
    reconnectTimer = setTimeout(_open, delay)
  }

  function send(data) {
    if (isHttpPollingMode()) {
      return
    }
    if (socket.value && socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(data))
    }
  }

  function disconnect() {
    intentionalClose = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (socket.value) {
      socket.value.close()
      socket.value = null
    }
    connected.value = false
    currentUrl = null
  }

  onUnmounted(disconnect)

  return { connected, connect, disconnect, send }
}
