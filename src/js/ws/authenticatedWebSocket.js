import tokenService from '@/core/cms/js/tokenService'
import { buildWebSocketUrl } from '@/js/api/baseUrl.js'

export const WS_AUTH_MESSAGE = 'auth'
export const WS_AUTH_OK_MESSAGE = 'auth_ok'
const WS_AUTH_TIMEOUT_MS = 10000

/**
 * WebSocket с JWT в первом JSON-сообщении (не в URL — не попадает в логи ошибок и прокси).
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
  let intentionalClose = false

  function clearAuthTimer() {
    if (authTimer) {
      clearTimeout(authTimer)
      authTimer = null
    }
  }

  function cleanup() {
    clearAuthTimer()
    socket = null
    authenticated = false
  }

  function connect() {
    const token = tokenService.getAccess()
    if (!token) {
      return null
    }

    intentionalClose = false
    authenticated = false

    try {
      socket = new WebSocket(url)
    } catch {
      onError?.()
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
        socket.send(JSON.stringify({ type: WS_AUTH_MESSAGE, token }))
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
        if (data?.type === WS_AUTH_OK_MESSAGE) {
          authenticated = true
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
    }

    socket.onerror = () => {
      onError?.()
    }

    return socket
  }

  function close() {
    intentionalClose = true
    clearAuthTimer()
    if (socket) {
      try {
        socket.close()
      } catch {
        // ignore
      }
    }
  }

  function getSocket() {
    return socket
  }

  function isAuthenticated() {
    return authenticated && socket?.readyState === WebSocket.OPEN
  }

  connect()

  return {
    close,
    getSocket,
    isAuthenticated,
    reconnect: connect,
  }
}
