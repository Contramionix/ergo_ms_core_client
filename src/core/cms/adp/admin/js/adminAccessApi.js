/**
 * API админ-панели: роли, политики, права модулей, доступ.
 * Возвращает response.data.
 */
import { apiClient } from '@/js/api/manager.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'

export async function checkAccessToAdminPanel() {
  const response = await apiClient.get(endpoints.cms.checkAccessToAdminPanel, {}, true)
  return response.data
}

export async function getPages() {
  const response = await apiClient.get(endpoints.cms.getpages, {}, true)
  return response.data
}

export async function getRoles() {
  const response = await apiClient.get(endpoints.cms.roles.list, {}, true)
  return response.data
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

export async function getRoleGroups() {
  const response = await apiClient.get(endpoints.cms.roleGroups.list, {}, true)
  return response.data
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

export async function getModulePermissions(roleGroupId = null) {
  const params = roleGroupId ? { role_group_id: roleGroupId } : {}
  const response = await apiClient.get(endpoints.cms.modulePermissions, params, true)
  return response.data
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
