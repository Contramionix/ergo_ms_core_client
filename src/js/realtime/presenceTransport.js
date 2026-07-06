import { createWebSocketTransport } from '@/js/realtime/transports/websocket.js'
import { isHttpPollingMode, isSseMode, pollIntervalMs } from '@/js/realtime/config.js'
import { getRealtimeClient } from '@/js/realtime/RealtimeClient.js'
import { registerPollJob } from '@/js/realtime/pollCoordinator.js'
import {
  isSyncPollingAuthenticated,
  registerSyncChannel,
} from '@/js/realtime/syncPollingHub.js'
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
  const connection = createWebSocketTransport(WS_PATH, handlers)
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
  let intentionalClose = false
  const removePageHide = attachPageHideOfflineBeacon()

  const handler = {
    onAuthenticated: () => handlers.onAuthenticated?.(),
    onError: () => handlers.onError?.(),
    onHeartbeat: () => {},
  }
  const unregister = registerSyncChannel('presence', handler)

  function onPageHide(event) {
    if (intentionalClose || event.persisted) {
      return
    }
    intentionalClose = true
    sendPresenceOfflineBeacon()
  }

  window.addEventListener('pagehide', onPageHide)

  return {
    close() {
      intentionalClose = true
      removePageHide()
      window.removeEventListener('pagehide', onPageHide)
      unregister()
      void presenceApi.offline().catch(() => {})
      handlers.onClose?.({}, true)
    },
    getSocket() {
      return null
    },
    isAuthenticated() {
      return isSyncPollingAuthenticated()
    },
    reconnect() {
      intentionalClose = false
    },
  }
}

function connectPresenceSse(handlers) {
  const removePageHide = attachPageHideOfflineBeacon()
  let unregisterPoll = null
  let authenticated = false
  const client = getRealtimeClient()

  async function sendHeartbeat() {
    if (document.visibilityState === 'hidden') {
      return
    }
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

  client.ensureConnected()
  unregisterPoll = registerPollJob('presence-sse-heartbeat', sendHeartbeat, pollIntervalMs('presence'))
  void sendHeartbeat()

  return {
    close() {
      removePageHide()
      unregisterPoll?.()
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
      authenticated = false
      void sendHeartbeat()
    },
  }
}

export function connectPresenceTransport(handlers = {}) {
  if (isHttpPollingMode()) {
    return connectPresenceHttpPolling(handlers)
  }
  if (isSseMode()) {
    return connectPresenceSse(handlers)
  }
  return connectPresenceWebSocket(handlers)
}
