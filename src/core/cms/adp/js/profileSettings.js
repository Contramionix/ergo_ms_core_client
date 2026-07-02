import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

const STORAGE_KEY = 'ergo_profile_settings'

const DEFAULT_SETTINGS = Object.freeze({
  profile_self_edit_enabled: true,
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
    if (!parsed || typeof parsed.profile_self_edit_enabled !== 'boolean') {
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
  if (!data || typeof data.profile_self_edit_enabled !== 'boolean') {
    return { ...DEFAULT_SETTINGS }
  }
  return {
    profile_self_edit_enabled: Boolean(data.profile_self_edit_enabled),
  }
}

export function getProfileSettingsSync() {
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

export async function fetchProfileSettings(force = false) {
  if (cachedSettings && !force) {
    return cachedSettings
  }
  if (settingsPromise && !force) {
    return settingsPromise
  }

  settingsPromise = apiClient
    .get(cmsEndpoints.auth.profileSettings, {}, false)
    .then((response) => {
      cachedSettings = normalizeSettings(response.data)
      writeStorageCache(cachedSettings)
      return cachedSettings
    })
    .catch(() => getProfileSettingsSync() || { ...DEFAULT_SETTINGS })
    .finally(() => {
      settingsPromise = null
    })

  return settingsPromise
}

export async function preloadProfileSettings() {
  return fetchProfileSettings()
}
