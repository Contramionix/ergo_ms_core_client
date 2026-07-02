import { apiClient } from '@/js/api/manager'
import { resolveApiClientBaseUrl } from '@/js/api/baseUrl.js'
import tokenService from '@/core/cms/js/tokenService'
import { cmsEndpoints } from '@/core/cms/js/endpoints.js'

const ep = cmsEndpoints.cms.presence

export const presenceApi = {
  heartbeat() {
    return apiClient.post(ep.heartbeat, {})
  },

  offline() {
    return apiClient.post(ep.offline, {})
  },

  adminSnapshot() {
    return apiClient.get(ep.adminSnapshot)
  },
}

export function sendPresenceOfflineBeacon() {
  const token = tokenService.getAccess()
  if (!token) {
    return
  }

  const url = `${resolveApiClientBaseUrl()}${ep.offline}`
  try {
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
      keepalive: true,
    })
  } catch {
    // best effort при закрытии вкладки
  }
}
