import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

const DEFAULT_SETTINGS = Object.freeze({
  mode: 'closed',
  registration_enabled: false,
  invitation_required: false,
})

let cachedSettings = null
let settingsPromise = null

function normalizeSettings(data) {
  if (!data || typeof data.mode !== 'string') {
    return { ...DEFAULT_SETTINGS }
  }
  return {
    mode: data.mode,
    registration_enabled: Boolean(data.registration_enabled),
    invitation_required: Boolean(data.invitation_required),
  }
}

export function getRegistrationSettingsSync() {
  return cachedSettings
}

export function isOpenRegistrationMode(settings) {
  return settings?.mode === 'open'
}

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
      cachedSettings = normalizeSettings(response.data)
      return cachedSettings
    })
    .catch(() => {
      const fallback = cachedSettings || { ...DEFAULT_SETTINGS }
      cachedSettings = fallback
      return fallback
    })
    .finally(() => {
      settingsPromise = null
    })

  return settingsPromise
}

export async function validateInvitationToken(token) {
  const response = await apiClient.post(
    cmsEndpoints.auth.validateInvitation,
    { token },
    false,
  )
  return response.data
}

export async function preloadRegistrationSettings() {
  return fetchRegistrationSettings()
}
