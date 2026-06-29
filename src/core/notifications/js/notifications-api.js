import { apiClient } from '@/js/api/manager'
import { notificationsEndpoints } from '@/core/notifications/js/endpoints.js'

const ep = notificationsEndpoints.notifications

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

  executeAction(id, actionId) {
    return apiClient.post(ep.executeAction(id), { action_id: actionId })
  },

  getPreferences() {
    return apiClient.get(ep.preferences)
  },

  patchPreferences(payload) {
    return apiClient.patch(ep.preferences, payload)
  },
}
