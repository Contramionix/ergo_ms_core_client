import tokenService from '@/core/cms/js/tokenService'
import { buildWebSocketUrl } from '@/js/api/baseUrl.js'
import {
  WS_AUTH_EVENT,
  WS_AUTH_OK_EVENT,
  WS_CONTROL_TOPIC,
  buildClientEnvelope,
  isRealtimeEnvelope,
} from '@/js/realtime/envelope.js'
import { MAX_RECONNECT_ATTEMPTS, reconnectDelayMs } from '@/js/realtime/reconnect.js'

const WS_AUTH_TIMEOUT_MS = 10000

export { WS_AUTH_EVENT, WS_AUTH_OK_EVENT, WS_CONTROL_TOPIC }

/**
 * WebSocket с JWT в первом envelope (не в URL — не попадает в логи и Referer).
 */
export function openAuthenticatedWebSocket(path, handlers = {}) {
  const {
    onAuthenticated,
    onMessage,
    onClose,
    onError,
  } = handlers

  const url = buildWebSocketUrl(path)
  let socket = null
  let authenticated = false
  let authTimer = null
  let reconnectTimer = null
  let reconnectAttempt = 0
  let intentionalClose = false

  function clearAuthTimer() {
    if (authTimer) {
      clearTimeout(authTimer)
      authTimer = null
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function cleanup() {
    clearAuthTimer()
    socket = null
    authenticated = false
  }

  function scheduleReconnect() {
    if (intentionalClose || reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      return
    }
    clearReconnectTimer()
    const delay = reconnectDelayMs(reconnectAttempt)
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, delay)
  }

  function connect() {
    const token = tokenService.getAccess()
    if (!token) {
      scheduleReconnect()
      return null
    }

    intentionalClose = false
    authenticated = false
    clearReconnectTimer()

    try {
      socket = new WebSocket(url)
    } catch {
      onError?.()
      scheduleReconnect()
      return null
    }

    authTimer = setTimeout(() => {
      if (!authenticated && socket) {
        try {
          socket.close()
        } catch {
          // ignore
        }
      }
    }, WS_AUTH_TIMEOUT_MS)

    socket.onopen = () => {
      try {
        socket.send(JSON.stringify(
          buildClientEnvelope(WS_AUTH_EVENT, { token }, WS_CONTROL_TOPIC),
        ))
      } catch {
        onError?.()
      }
    }

    socket.onmessage = (event) => {
      let data
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }

      if (!authenticated) {
        if (isRealtimeEnvelope(data) && data.type === WS_AUTH_OK_EVENT) {
          authenticated = true
          reconnectAttempt = 0
          clearAuthTimer()
          onAuthenticated?.(socket)
        }
        return
      }

      onMessage?.(event, data)
    }

    socket.onclose = (event) => {
      const wasIntentional = intentionalClose
      cleanup()
      onClose?.(event, wasIntentional)
      if (!wasIntentional) {
        scheduleReconnect()
      }
    }

    socket.onerror = () => {
      onError?.()
    }

    return socket
  }

  function close() {
    intentionalClose = true
    clearReconnectTimer()
    clearAuthTimer()
    if (socket) {
      try {
        socket.close()
      } catch {
        // ignore
      }
    }
    cleanup()
  }

  function getSocket() {
    return socket
  }

  function isAuthenticated() {
    return authenticated && socket?.readyState === WebSocket.OPEN
  }

  function reconnect() {
    intentionalClose = false
    reconnectAttempt = 0
    clearReconnectTimer()
    if (socket) {
      try {
        socket.close()
      } catch {
        // ignore
      }
    }
    connect()
  }

  connect()

  return {
    close,
    getSocket,
    isAuthenticated,
    reconnect,
  }
}
