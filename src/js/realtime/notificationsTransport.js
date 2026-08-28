import { getRealtimeClient } from '@/js/realtime/RealtimeClient.js'
import { isHttpPollingMode, isSseMode } from '@/js/realtime/config.js'
import { createWebSocketTransport } from '@/js/realtime/transports/websocket.js'
import {
  isSyncPollingAuthenticated,
  registerSyncChannel,
  setSyncLastNotificationId,
} from '@/js/realtime/syncPollingHub.js'

const WS_PATH = '/ws/notifications/'

function connectNotificationsWebSocket(handlers) {
  return createWebSocketTransport(WS_PATH, handlers)
}

function connectNotificationsSse(handlers) {
  const client = getRealtimeClient()

  client.ensureConnected({
    onAuthenticated: () => {
      handlers.onAuthenticated?.()
    },
    onError: () => {
      handlers.onError?.()
    },
    onClose: (event, intentional) => {
      handlers.onClose?.(event, intentional)
    },
  })

  const offNew = client.on('notification_new', (event, data) => {
    handlers.onMessage?.(event, data)
  })
  const offSignal = client.on('workspace_signal', (event, data) => {
    handlers.onMessage?.(event, data)
  })

  return {
    close() {
      offNew?.()
      offSignal?.()
      handlers.onClose?.({}, true)
    },
    getSocket() {
      return null
    },
    isAuthenticated() {
      return client.isConnected()
    },
    reconnect() {
      client.reconnectStream()
    },
    setLastNotificationId(id) {
      setSyncLastNotificationId(id)
    },
  }
}

function connectNotificationsHttpPolling(handlers) {
  const handler = {
    onAuthenticated: () => handlers.onAuthenticated?.(),
    onError: () => handlers.onError?.(),
    onPollMeta: (meta) => handlers.onPollMeta?.(meta),
    onMessage: (event, data) => handlers.onMessage?.(event, data),
  }
  const unregister = registerSyncChannel('notifications', handler)

  return {
    close() {
      unregister()
      handlers.onClose?.({}, true)
    },
    getSocket() {
      return null
    },
    isAuthenticated() {
      return isSyncPollingAuthenticated()
    },
    reconnect() {
      handler.onAuthenticated = () => handlers.onAuthenticated?.()
    },
    setLastNotificationId(id) {
      setSyncLastNotificationId(id)
    },
  }
}

export function connectNotificationsTransport(handlers = {}) {
  if (isHttpPollingMode()) {
    return connectNotificationsHttpPolling(handlers)
  }
  if (isSseMode()) {
    return connectNotificationsSse(handlers)
  }
  return connectNotificationsWebSocket(handlers)
}
