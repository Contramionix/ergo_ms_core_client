import { apiClient } from '@/js/api/manager.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'

export async function fetchDevToolsStatus() {
  return apiClient.get(endpoints.cms.devTools.status, {}, true, { quietStatuses: [403, 404] })
}

export async function fetchDevToolsSession() {
  return apiClient.get(endpoints.cms.devTools.session, {}, true)
}

export async function saveDevToolsSession(payload) {
  return apiClient.put(endpoints.cms.devTools.session, payload, true)
}

export async function clearDevToolsSession() {
  return apiClient.delete(endpoints.cms.devTools.session, {}, true)
}

export async function searchDevToolsUsers(query) {
  return apiClient.get(endpoints.cms.devTools.users, { q: query || '' }, true)
}

export async function fetchDevToolsRoles() {
  return apiClient.get(endpoints.cms.devTools.roles, {}, true)
}

export async function fetchDevToolsPermissionCatalog() {
  return apiClient.get(endpoints.cms.devTools.permissionCatalog, {}, true)
}
