import { CheckAccess } from '@/core/cms/js/cms'
import { invalidateUserAvatar } from '@/js/userAvatar.js'
import {
  mapUserProfileToFormData,
  validateUserProfileData,
} from '@/core/cms/adp/js/userProfileForm.js'

export const mapAdminUserToFormData = mapUserProfileToFormData

export async function fetchAdminUser(userId) {
  const response = await CheckAccess.GetAdminUser(userId)
  return response.data
}

export async function updateAdminUser(userId, data) {
  const response = await CheckAccess.UpdateAdminUser(userId, data)
  return response.data
}

export async function deleteAdminUser(userId) {
  await CheckAccess.DeleteAdminUser(userId)
}

export async function uploadAdminUserAvatar(userId, file) {
  const response = await CheckAccess.UploadAdminUserAvatar(userId, file)
  invalidateUserAvatar(userId)
  return response.data
}

export async function deleteAdminUserAvatar(userId) {
  await CheckAccess.DeleteAdminUserAvatar(userId)
  invalidateUserAvatar(userId)
}

export function validateAdminProfileData(data) {
  return validateUserProfileData(data)
}

export async function resetAdminUserPassword(userId, payload = {}) {
  const response = await CheckAccess.ResetAdminUserPassword(userId, payload)
  return response.data
}
