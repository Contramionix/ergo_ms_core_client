import { openAuthenticatedWebSocket } from '@/js/ws/authenticatedWebSocket.js'
import { isHttpPollingMode, pollIntervalMs } from '@/js/realtime/config.js'
import { presenceApi, sendPresenceOfflineBeacon } from '@/js/realtime/presenceApi.js'

const WS_PATH = '/ws/presence/'

function attachPageHideOfflineBeacon() {
  function onPageHide(event) {
    if (event.persisted) {
      return
    }
    sendPresenceOfflineBeacon()
  }

  window.addEventListener('pagehide', onPageHide)
  return () => window.removeEventListener('pagehide', onPageHide)
}

function connectPresenceWebSocket(handlers) {
  const connection = openAuthenticatedWebSocket(WS_PATH, handlers)
  const removePageHide = attachPageHideOfflineBeacon()
  const originalClose = connection.close.bind(connection)

  return {
    ...connection,
    close() {
      removePageHide()
      originalClose()
    },
  }
}

function connectPresenceHttpPolling(handlers) {
  let heartbeatTimer = null
  let authenticated = false
  let intentionalClose = false
  const intervalMs = pollIntervalMs('presence')

  async function sendHeartbeat() {
    if (intentionalClose) {
      return
    }
    try {
      await presenceApi.heartbeat()
      if (intentionalClose) {
        return
      }
      if (!authenticated) {
        authenticated = true
        handlers.onAuthenticated?.()
      }
    } catch {
      authenticated = false
      handlers.onError?.()
    }
  }

  function startTimers() {
    stopTimers()
    void sendHeartbeat()
    heartbeatTimer = setInterval(() => {
      void sendHeartbeat()
    }, intervalMs)
  }

  function stopTimers() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  function onPageHide(event) {
    if (intentionalClose || event.persisted) {
      return
    }
    intentionalClose = true
    stopTimers()
    sendPresenceOfflineBeacon()
  }

  window.addEventListener('pagehide', onPageHide)
  startTimers()

  return {
    close() {
      intentionalClose = true
      window.removeEventListener('pagehide', onPageHide)
      stopTimers()
      authenticated = false
      void presenceApi.offline().catch(() => {})
      handlers.onClose?.({}, true)
    },
    getSocket() {
      return null
    },
    isAuthenticated() {
      return authenticated
    },
    reconnect() {
      intentionalClose = false
      authenticated = false
      startTimers()
    },
  }
}

export function connectPresenceTransport(handlers = {}) {
  if (isHttpPollingMode()) {
    return connectPresenceHttpPolling(handlers)
  }
  return connectPresenceWebSocket(handlers)
}
