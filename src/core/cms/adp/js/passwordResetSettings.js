import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

const STORAGE_KEY = 'ergo_password_reset_settings'

const DEFAULT_SETTINGS = Object.freeze({
  password_reset_enabled: true,
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
    if (!parsed || typeof parsed.password_reset_enabled !== 'boolean') {
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
  if (!data || typeof data.password_reset_enabled !== 'boolean') {
    return { ...DEFAULT_SETTINGS }
  }
  return {
    password_reset_enabled: Boolean(data.password_reset_enabled),
  }
}

export function getPasswordResetSettingsSync() {
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

export async function fetchPasswordResetSettings(force = false) {
  if (cachedSettings && !force) {
    return cachedSettings
  }
  if (settingsPromise && !force) {
    return settingsPromise
  }

  settingsPromise = apiClient
    .get(cmsEndpoints.auth.passwordResetSettings, {}, false)
    .then((response) => {
      cachedSettings = normalizeSettings(response.data)
      writeStorageCache(cachedSettings)
      return cachedSettings
    })
    .catch(() => getPasswordResetSettingsSync() || { ...DEFAULT_SETTINGS })
    .finally(() => {
      settingsPromise = null
    })

  return settingsPromise
}

export async function preloadPasswordResetSettings() {
  return fetchPasswordResetSettings()
}
