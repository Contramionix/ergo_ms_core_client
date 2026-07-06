import { getRealtimeClient, presenceAdminTopic } from '@/js/realtime/RealtimeClient.js'
import { createWebSocketTransport } from '@/js/realtime/transports/websocket.js'
import { isHttpPollingMode, isSseMode } from '@/js/realtime/config.js'
import { registerPollJob } from '@/js/realtime/pollCoordinator.js'
import { presenceApi } from '@/js/realtime/presenceApi.js'
import {
  isSyncPollingAuthenticated,
  registerSyncChannel,
} from '@/js/realtime/syncPollingHub.js'
import { mergeSnapshot } from '@/core/cms/adp/js/presence/presenceStore.js'

const WS_PATH = '/ws/presence/admin/'
const SSE_RECONCILE_MS = 5 * 60 * 1000

function connectAdminPresenceWebSocket(handlers) {
  return createWebSocketTransport(WS_PATH, {
    ...handlers,
    onMessage: (event, data) => {
      if (data?.type === 'presence_snapshot' && data.payload?.users) {
        mergeSnapshot(data.payload.users)
      }
      handlers.onMessage?.(event, data)
    },
  })
}

function connectAdminPresenceHttpPolling(handlers) {
  const handler = {
    onAuthenticated: () => handlers.onAuthenticated?.(),
    onError: () => handlers.onError?.(),
    onSnapshot: (users) => {
      mergeSnapshot(users)
    },
  }
  const unregister = registerSyncChannel('adminPresence', handler)

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
  }
}

function connectAdminPresenceSse(handlers) {
  const client = getRealtimeClient()
  let reconcileUnregister = null
  let authenticated = false

  void client.subscribe(presenceAdminTopic())
  client.ensureConnected({
    onAuthenticated: () => {
      authenticated = true
      handlers.onAuthenticated?.()
    },
  })

  const offDelta = client.on('presence_delta', (_event, data) => {
    const users = data?.payload?.users
    if (users) {
      mergeSnapshot(users)
    }
  })

  const offSnapshot = client.on('presence_snapshot', (_event, data) => {
    const users = data?.payload?.users
    if (users) {
      mergeSnapshot(users)
    }
  })

  async function reconcileSnapshot() {
    try {
      const resp = await presenceApi.adminSnapshot()
      const users = resp?.data?.users ?? resp?.users ?? []
      mergeSnapshot(users)
    } catch {
      // ignore
    }
  }

  void reconcileSnapshot()
  reconcileUnregister = registerPollJob(
    'admin-presence-sse-reconcile',
    reconcileSnapshot,
    SSE_RECONCILE_MS,
  )

  return {
    close() {
      offDelta?.()
      offSnapshot?.()
      reconcileUnregister?.()
      void client.unsubscribe(presenceAdminTopic())
      authenticated = false
      handlers.onClose?.({}, true)
    },
    getSocket() {
      return null
    },
    isAuthenticated() {
      return authenticated
    },
    reconnect() {
      void getRealtimeClient().subscribe(presenceAdminTopic())
      getRealtimeClient().ensureConnected()
    },
  }
}

export function connectAdminPresenceTransport(handlers = {}) {
  if (isHttpPollingMode()) {
    return connectAdminPresenceHttpPolling(handlers)
  }
  if (isSseMode()) {
    return connectAdminPresenceSse(handlers)
  }
  return connectAdminPresenceWebSocket(handlers)
}
