import { apiClient } from '@/js/api/manager.js'
import tokenService from '@/core/cms/js/tokenService.js'

/** Относительно baseURL apiClient (`…/api/`). */
export const CLIENT_MONITOR_ENDPOINT = 'cms/client-monitor/events/'

/**
 * Silent POST — без handleError / logError, иначе петля мониторинга.
 */
export function postMonitorBatchSilent(payload) {
  const token = tokenService.getAccess()
  if (!token) {
    return Promise.resolve()
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  return apiClient.client
    .post(CLIENT_MONITOR_ENDPOINT, payload, { headers })
    .catch(() => {})
}

/** fetch keepalive для pagehide / logout (Authorization + body). */
export function postMonitorBatchKeepalive(payload) {
  const token = tokenService.getAccess()
  if (!token || typeof fetch !== 'function') {
    return
  }
  const base = apiClient.client?.defaults?.baseURL || '/api/'
  const url = `${base.replace(/\/?$/, '/')}${CLIENT_MONITOR_ENDPOINT}`
  try {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'include',
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
