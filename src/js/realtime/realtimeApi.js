import { resolveApiClientBaseUrl } from '@/js/api/baseUrl.js'
import { apiClient } from '@/js/api/manager'

export const realtimeApi = {
  config() {
    return apiClient.get('realtime/config/')
  },

  sync(params = {}) {
    return apiClient.get('realtime/sync/', { params })
  },

  subscribe(topic) {
    return apiClient.post('realtime/subscriptions/', { action: 'subscribe', topic })
  },

  unsubscribe(topic) {
    return apiClient.post('realtime/subscriptions/', { action: 'unsubscribe', topic })
  },
}

export function buildRealtimeStreamUrl() {
  const base = resolveApiClientBaseUrl()
  return `${base}realtime/stream/`
}
