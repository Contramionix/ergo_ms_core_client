import { apiClient } from '@/js/api/manager.js'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'
import { invalidateUserAvatar } from '@/js/userAvatar.js'
import {
  mapUserProfileToFormData,
  validateUserProfileData,
} from '@/core/cms/adp/js/userProfileForm.js'

export const mapAdminUserToFormData = mapUserProfileToFormData

export async function fetchAdminUser(userId) {
  const response = await apiClient.get(endpoints.cms.adminUserDetail(userId), {}, true)
  return response.data
}

export async function updateAdminUser(userId, data) {
  const response = await apiClient.put(endpoints.cms.adminUserDetail(userId), data, true)
  return response.data
}

export async function deleteAdminUser(userId) {
  await apiClient.delete(endpoints.cms.adminUserDetail(userId), {}, true)
}

export async function uploadAdminUserAvatar(userId, file) {
  const uploadResult = await mediaApiClient.upload(file, {
    targetDir: 'avatars/',
    allowedTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    maxSize: 5 * 1024 * 1024,
  })
  const response = await apiClient.post(
    endpoints.cms.adminUserAvatar(userId),
    { image_path: uploadResult.path },
    true,
  )
  invalidateUserAvatar(userId)
  return response.data
}

export async function deleteAdminUserAvatar(userId) {
  await apiClient.delete(endpoints.cms.adminUserAvatar(userId), {}, true)
  invalidateUserAvatar(userId)
}

export function validateAdminProfileData(data) {
  return validateUserProfileData(data)
}

export async function createAdminUser(data) {
  const response = await apiClient.post(endpoints.cms.adminUsers, data, true)
  return response.data
}

export async function resetAdminUserPassword(userId, payload = {}) {
  const response = await apiClient.post(endpoints.cms.adminUserResetPassword(userId), payload, true)
  return response.data
}
