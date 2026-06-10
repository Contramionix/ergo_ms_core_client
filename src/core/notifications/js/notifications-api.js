import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

const ep = endpoints.notifications

export const notificationsApi = {
  list(params = {}) {
    return apiClient.get(ep.list, params)
  },

  unreadCount() {
    return apiClient.get(ep.unreadCount)
  },

  markRead(id) {
    return apiClient.post(ep.markRead(id), {})
  },

  markAllRead() {
    return apiClient.post(ep.markAllRead, {})
  },

  getPreferences() {
    return apiClient.get(ep.preferences)
  },

  patchPreferences(payload) {
    return apiClient.patch(ep.preferences, payload)
  },
}
