import { clientEnv } from '@/js/clientEnv.js'
import { apiClient } from '@/js/api/manager.js'
import tokenService from '@/core/cms/js/tokenService.js'
import { useMaintenanceMode } from '@/composables/useMaintenanceMode.js'

/** Относительно baseURL apiClient (`…/api/`). */
const CLIENT_LOG_ENDPOINT = 'cms/client-log/'

const DEDUPE_WINDOW_MS = 5000
const recentMessages = new Map()

function shouldSendBrowserLog() {
  if (!clientEnv.browserLogEnabled) {
    return false
  }
  const { maintenanceActive } = useMaintenanceMode()
  if (maintenanceActive.value) {
    return false
  }
  return true
}

function isDuplicateMessage(message) {
  const now = Date.now()
  const lastSent = recentMessages.get(message)
  if (lastSent != null && now - lastSent < DEDUPE_WINDOW_MS) {
    return true
  }
  recentMessages.set(message, now)
  if (recentMessages.size > 100) {
    for (const [key, ts] of recentMessages) {
      if (now - ts >= DEDUPE_WINDOW_MS) {
        recentMessages.delete(key)
      }
    }
  }
  return false
}

/** POST без handleError apiClient — иначе ошибка client-log снова вызывает logError. */
function postBrowserLogSilent(payload) {
  const headers = { 'Content-Type': 'application/json' }
  const token = tokenService.getAccess()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  apiClient.client.post(CLIENT_LOG_ENDPOINT, payload, { headers }).catch(() => {})
}

export function sendBrowserLog(level, message, context = {}) {
  if (!shouldSendBrowserLog()) {
    return
  }
  if (!message || typeof message !== 'string') {
    return
  }
  if (isDuplicateMessage(message)) {
    return
  }

  const payload = {
    level,
    message,
    context: context && typeof context === 'object' ? context : {},
    path: typeof window !== 'undefined' ? window.location.pathname : '',
  }

  postBrowserLogSilent(payload)
}

export function sendBrowserError(message, context = {}, options = {}) {
  if (!message) {
    return
  }
  sendBrowserLog('error', message, {
    context: typeof context === 'string' ? context : options.endpoint || 'client',
    endpoint: options.endpoint,
  })
}
