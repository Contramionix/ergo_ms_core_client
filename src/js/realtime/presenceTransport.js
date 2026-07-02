import { openAuthenticatedWebSocket } from '@/js/ws/authenticatedWebSocket.js'
import { isHttpPollingMode, pollIntervalMs } from '@/js/realtime/config.js'
import { presenceApi, sendPresenceOfflineBeacon } from '@/js/realtime/presenceApi.js'

const WS_PATH = '/ws/presence/'

function connectPresenceWebSocket(handlers) {
  return openAuthenticatedWebSocket(WS_PATH, handlers)
}

function connectPresenceHttpPolling(handlers) {
  let heartbeatTimer = null
  let authenticated = false
  let intentionalClose = false
  const intervalMs = pollIntervalMs('presence')

  async function sendHeartbeat() {
    try {
      await presenceApi.heartbeat()
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

  function onPageHide() {
    if (!intentionalClose) {
      sendPresenceOfflineBeacon()
    }
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
