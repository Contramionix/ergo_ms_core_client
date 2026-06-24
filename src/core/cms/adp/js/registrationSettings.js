import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

const STORAGE_KEY = 'ergo_registration_settings'

const DEFAULT_SETTINGS = Object.freeze({
  mode: 'closed',
  registration_enabled: false,
  invitation_required: false,
})

let cachedSettings = null
let settingsPromise = null

function readStorageCache() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.mode !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeStorageCache(settings) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // ignore quota / private mode errors
  }
}

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
  if (cachedSettings) {
    return cachedSettings
  }

  const stored = readStorageCache()
  if (stored) {
    cachedSettings = normalizeSettings(stored)
    return cachedSettings
  }

  return null
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
      writeStorageCache(cachedSettings)
      return cachedSettings
    })
    .catch(() => getRegistrationSettingsSync() || { ...DEFAULT_SETTINGS })
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

export async function preloadRegistrationSettings() {
  return fetchRegistrationSettings()
}
