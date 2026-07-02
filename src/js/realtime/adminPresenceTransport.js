import { openAuthenticatedWebSocket } from '@/js/ws/authenticatedWebSocket.js'
import { isHttpPollingMode, pollIntervalMs } from '@/js/realtime/config.js'
import { presenceApi } from '@/js/realtime/presenceApi.js'
import { mergeSnapshot } from '@/core/cms/adp/js/presence/presenceStore.js'

const WS_PATH = '/ws/presence/admin/'

function connectAdminPresenceWebSocket(handlers) {
  return openAuthenticatedWebSocket(WS_PATH, {
    ...handlers,
    onMessage: (event, data) => {
      if (data?.type === 'presence_snapshot') {
        mergeSnapshot(data.users)
      }
      handlers.onMessage?.(event, data)
    },
  })
}

function connectAdminPresenceHttpPolling(handlers) {
  let pollTimer = null
  let authenticated = false
  const intervalMs = pollIntervalMs('adminPresence')

  async function pollSnapshot() {
    try {
      const resp = await presenceApi.adminSnapshot()
      const users = resp?.data?.users ?? resp?.users ?? []
      mergeSnapshot(users)
      if (!authenticated) {
        authenticated = true
        handlers.onAuthenticated?.()
      }
    } catch {
      authenticated = false
      handlers.onError?.()
    }
  }

  function schedulePoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
    }
    void pollSnapshot()
    pollTimer = setInterval(() => {
      void pollSnapshot()
    }, intervalMs)
  }

  schedulePoll()

  return {
    close() {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
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
      authenticated = false
      schedulePoll()
    },
  }
}

export function connectAdminPresenceTransport(handlers = {}) {
  if (isHttpPollingMode()) {
    return connectAdminPresenceHttpPolling(handlers)
  }
  return connectAdminPresenceWebSocket(handlers)
}
