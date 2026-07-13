import { apiClient } from '@/js/api/manager.js'
import { mediaApiClient } from '@/js/api/media-api-client.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'
import { invalidateUserPublicInfoByRef } from '@/js/userAvatar.js'
import {
  mapUserProfileToFormData,
  validateUserProfileData,
} from '@/core/cms/adp/js/userProfileForm.js'

export const mapAdminUserToFormData = mapUserProfileToFormData

export async function fetchAdminUser(userRef) {
  const response = await apiClient.get(endpoints.cms.adminUserDetail(userRef), {}, true)
  return response.data
}

export async function updateAdminUser(userRef, data) {
  const response = await apiClient.put(endpoints.cms.adminUserDetail(userRef), data, true)
  return response.data
}

export async function deleteAdminUser(userRef) {
  await apiClient.delete(endpoints.cms.adminUserDetail(userRef), {}, true)
}

export async function uploadAdminUserAvatar(userRef, file) {
  const uploadResult = await mediaApiClient.upload(file, {
    targetDir: 'avatars/',
    allowedTypes: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
    maxSize: 5 * 1024 * 1024,
  })
  const response = await apiClient.post(
    endpoints.cms.adminUserAvatar(userRef),
    { image_path: uploadResult.path },
    true,
  )
  invalidateUserPublicInfoByRef(userRef)
  return response.data
}

export async function deleteAdminUserAvatar(userRef) {
  await apiClient.delete(endpoints.cms.adminUserAvatar(userRef), {}, true)
  invalidateUserPublicInfoByRef(userRef)
}

export function validateAdminProfileData(data) {
  return validateUserProfileData(data)
}

export async function createAdminUser(data) {
  const response = await apiClient.post(endpoints.cms.adminUsers, data, true)
  return response.data
}

export async function resetAdminUserPassword(userRef, payload = {}) {
  const response = await apiClient.post(endpoints.cms.adminUserResetPassword(userRef), payload, true)
  return response.data
}
