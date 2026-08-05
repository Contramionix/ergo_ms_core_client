/**
 * API админ-панели: роли, политики, права модулей, доступ.
 * Возвращает response.data.
 */
import { apiClient } from '@/js/api/manager.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'
import { getSessionBootstrapCache } from '@/core/cms/js/sessionBootstrapCache.js'
import {
  getAdminAccessCache,
  invalidateAdminAccessCache,
  setAdminAccessCache,
} from '@/core/cms/adp/admin/js/adminAccessCache.js'
import { whenSessionReady } from '@/js/sessionReady.js'

export { invalidateAdminAccessCache }

function usesServerListParams(params = {}) {
  return ['q', 'search', 'page', 'page_size'].some(
    (key) => params[key] != null && params[key] !== '',
  )
}

export function normalizePaginatedList(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      page_size: data.length,
    }
  }
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    page_size: data.page_size ?? 20,
  }
}

function readAccessFromBootstrap() {
  const bootstrap = getSessionBootstrapCache()
  if (bootstrap && typeof bootstrap.access_to_panel === 'boolean') {
    return setAdminAccessCache({ access_to_panel: bootstrap.access_to_panel })
  }
  return null
}

/**
 * Доступ к админ-панели — из session-bootstrap / TTL-кеша.
 * На F5 guard часто бежит раньше bootstrap: ждём whenSessionReady,
 * иначе ложный false → /access-denied.
 */
export async function checkAccessToAdminPanel() {
  const fromBootstrap = readAccessFromBootstrap()
  if (fromBootstrap) {
    return fromBootstrap
  }

  const cached = getAdminAccessCache()
  if (cached) {
    return cached
  }

  try {
    await whenSessionReady()
  } catch {
    /* bootstrap недоступен */
  }

  const afterReady = readAccessFromBootstrap()
  if (afterReady) {
    return afterReady
  }

  return { access_to_panel: false }
}

export async function getPages() {
  const response = await apiClient.get(endpoints.cms.getpages, {}, true)
  return response.data
}

export async function getRoles(params = {}) {
  const response = await apiClient.get(endpoints.cms.roles.list, params, true)
  if (usesServerListParams(params)) {
    return normalizePaginatedList(response.data)
  }
  return Array.isArray(response.data) ? response.data : normalizePaginatedList(response.data).items
}

export async function createRole(payload) {
  const response = await apiClient.post(endpoints.cms.roles.list, payload, true)
  return response.data
}

export async function updateRole(roleId, payload) {
  const response = await apiClient.put(`${endpoints.cms.roles.detail}${roleId}/`, payload, true)
  return response.data
}

export async function deleteRole(roleId) {
  const response = await apiClient.delete(`${endpoints.cms.roles.detail}${roleId}/`, {}, true)
  return response.data
}

export async function getRoleGroups(params = {}) {
  const response = await apiClient.get(endpoints.cms.roleGroups.list, params, true)
  if (usesServerListParams(params)) {
    return normalizePaginatedList(response.data)
  }
  return Array.isArray(response.data) ? response.data : normalizePaginatedList(response.data).items
}

export async function getRoleGroupOptions() {
  const response = await apiClient.get(endpoints.cms.roleGroups.list, { minimal: 1 }, true)
  return response.data
}

export async function createRoleGroup(payload) {
  const response = await apiClient.post(endpoints.cms.roleGroups.list, payload, true)
  return response.data
}

export async function updateRoleGroup(groupId, payload) {
  const response = await apiClient.put(`${endpoints.cms.roleGroups.detail}${groupId}/`, payload, true)
  return response.data
}

export async function deleteRoleGroup(groupId) {
  const response = await apiClient.delete(`${endpoints.cms.roleGroups.detail}${groupId}/`, {}, true)
  return response.data
}

export async function getPolicies() {
  const response = await apiClient.get(endpoints.cms.policies.list, {}, true)
  return response.data
}

export async function createPolicy(payload) {
  const response = await apiClient.post(endpoints.cms.policies.list, payload, true)
  return response.data
}

export async function updatePolicy(policyId, payload) {
  const response = await apiClient.put(`${endpoints.cms.policies.detail}${policyId}/`, payload, true)
  return response.data
}

export async function deletePolicy(policyId) {
  const response = await apiClient.delete(`${endpoints.cms.policies.detail}${policyId}/`, {}, true)
  return response.data
}

export async function assignRoleToUser(payload) {
  const response = await apiClient.post(endpoints.cms.assignRole, payload, true)
  return response.data
}

export async function getAdminUsers(params = {}) {
  const response = await apiClient.get(endpoints.cms.adminUsers, params, true)
  return response.data
}

export async function getModulePermissions(roleGroupId = null, params = {}) {
  const query = { ...params }
  if (roleGroupId) {
    query.role_group_id = roleGroupId
  }
  const response = await apiClient.get(endpoints.cms.modulePermissions, query, true)
  if (usesServerListParams(params)) {
    return normalizePaginatedList(response.data)
  }
  return Array.isArray(response.data) ? response.data : normalizePaginatedList(response.data).items
}

export async function createModulePermission(payload) {
  const response = await apiClient.post(endpoints.cms.modulePermissions, payload, true)
  return response.data
}

export async function updateModulePermission(permissionId, payload) {
  const response = await apiClient.put(`${endpoints.cms.modulePermissions}${permissionId}/`, payload, true)
  return response.data
}

export async function deleteModulePermission(permissionId) {
  const response = await apiClient.delete(`${endpoints.cms.modulePermissions}${permissionId}/`, {}, true)
  return response.data
}

export async function getModuleCatalog(params = {}) {
  const response = await apiClient.get(endpoints.cms.moduleCatalog, params, true)
  return response.data
}
