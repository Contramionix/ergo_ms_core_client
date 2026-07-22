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

  sourceModules() {
    return apiClient.get(ep.sourceModules)
  },

  markRead(id) {
    return apiClient.post(ep.markRead(id), {})
  },

  markAllRead(payload = {}) {
    return apiClient.post(ep.markAllRead, payload)
  },

  archive(id) {
    return apiClient.post(ep.archive(id), {})
  },

  unarchive(id) {
    return apiClient.post(ep.unarchive(id), {})
  },

  hideFromSidebar(id) {
    return apiClient.post(ep.hideFromSidebar(id), {})
  },

  softDelete(id) {
    return apiClient.post(ep.softDelete(id), {})
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
