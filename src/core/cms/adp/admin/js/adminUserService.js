import { CheckAccess } from '@/core/cms/js/cms'
import { profileService } from '@/core/cms/js/profileService.js'
import { invalidateUserAvatar } from '@/js/userAvatar.js'

const normalizeEmptyString = (value) => (value === ' ' ? '' : (value || ''))

export function mapAdminUserToFormData(userData) {
  if (!userData) return {}

  const profile = userData.adp_profile || {}

  return {
    first_name: normalizeEmptyString(userData.first_name),
    last_name: normalizeEmptyString(userData.last_name),
    middle_name: normalizeEmptyString(userData.middle_name),
    email: userData.email || '',
    website: profile.website || '',
    bio: profile.bio || '',
    country: profile.country || '',
    city: profile.city || '',
  }
}

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
  return profileService.validateProfileData(data)
}

export async function resetAdminUserPassword(userId, payload = {}) {
  const response = await CheckAccess.ResetAdminUserPassword(userId, payload)
  return response.data
}
