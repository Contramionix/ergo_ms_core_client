import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

let cachedSettings = null
let settingsPromise = null

export async function fetchRegistrationSettings(force = false) {
  if (cachedSettings && !force) {
    return cachedSettings
  }
  if (settingsPromise && !force) {
    return settingsPromise
  }

  settingsPromise = apiClient
    .get(cmsEndpoints.auth.registrationSettings, {}, false)
    .then((response) => {
      cachedSettings = response.data || {
        mode: 'open',
        registration_enabled: true,
        invitation_required: false,
      }
      return cachedSettings
    })
    .finally(() => {
      settingsPromise = null
    })

  return settingsPromise
}

export async function validateInvitationToken(token) {
  const response = await apiClient.get(
    cmsEndpoints.auth.validateInvitation,
    { token },
    false,
  )
  return response.data
}
