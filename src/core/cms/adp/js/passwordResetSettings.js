import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

// При неизвестном состоянии не показываем ссылку (как у регистрации: fail-closed).
const DEFAULT_SETTINGS = Object.freeze({
  password_reset_enabled: false,
})

let cachedSettings = null
let settingsPromise = null

function normalizeSettings(data) {
  if (!data || typeof data.password_reset_enabled !== 'boolean') {
    return { ...DEFAULT_SETTINGS }
  }
  return {
    password_reset_enabled: Boolean(data.password_reset_enabled),
  }
}

export function getPasswordResetSettingsSync() {
  return cachedSettings
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

export async function preloadPasswordResetSettings() {
  return fetchPasswordResetSettings()
}
