import { openAuthenticatedWebSocket } from '@/js/ws/authenticatedWebSocket.js'
import { isHttpPollingMode, pollIntervalMs } from '@/js/realtime/config.js'
import { notificationsApi } from '@/core/notifications/js/notifications-api'

const WS_PATH = '/ws/notifications/'

function connectNotificationsWebSocket(handlers) {
  return openAuthenticatedWebSocket(WS_PATH, handlers)
}

function connectNotificationsHttpPolling(handlers) {
  let pollTimer = null
  let authenticated = false
  let lastNotificationId = 0
  const intervalMs = pollIntervalMs('notifications')

  async function pollNotifications() {
    try {
      const params = { page_size: 50 }
      if (lastNotificationId > 0) {
        params.after_id = lastNotificationId
      }

      const requests = [notificationsApi.unreadCount()]
      if (lastNotificationId > 0) {
        requests.push(notificationsApi.list(params))
      }

      const results = await Promise.all(requests)
      const countResp = results[0]
      const listResp = lastNotificationId > 0 ? results[1] : null

      if (!authenticated) {
        authenticated = true
        handlers.onAuthenticated?.()
      }

      handlers.onPollMeta?.({
        unreadCount: Number(countResp?.data?.count ?? 0),
      })

      if (listResp) {
        const list = listResp?.data?.results ?? listResp?.data ?? []
        const items = Array.isArray(list) ? list : []
        for (const notification of items) {
          if (notification?.id > lastNotificationId) {
            lastNotificationId = notification.id
          }
          handlers.onMessage?.(null, {
            type: 'notification_new',
            notification,
          })
        }
      }
    } catch {
      authenticated = false
      handlers.onError?.()
    }
  }

  function startPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
    }
    void pollNotifications()
    pollTimer = setInterval(() => {
      void pollNotifications()
    }, intervalMs)
  }

  startPolling()

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
      startPolling()
    },
    setLastNotificationId(id) {
      const parsed = Number.parseInt(String(id ?? ''), 10)
      if (Number.isFinite(parsed) && parsed > lastNotificationId) {
        lastNotificationId = parsed
      }
    },
  }
}

export function connectNotificationsTransport(handlers = {}) {
  if (isHttpPollingMode()) {
    return connectNotificationsHttpPolling(handlers)
  }
  return connectNotificationsWebSocket(handlers)
}
