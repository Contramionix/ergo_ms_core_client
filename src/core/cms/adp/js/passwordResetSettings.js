import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

// При неизвестном состоянии не показываем ссылку (как у регистрации: fail-closed).
const DEFAULT_SETTINGS = Object.freeze({
  password_reset_enabled: false,
  email_delivery_ready: false,
  password_reset_available: false,
})

let cachedSettings = null
let settingsPromise = null

function normalizeSettings(data) {
  if (!data || typeof data.password_reset_enabled !== 'boolean') {
    return { ...DEFAULT_SETTINGS }
  }
  const enabled = Boolean(data.password_reset_enabled)
  const emailReady = data.email_delivery_ready === true
  const available = typeof data.password_reset_available === 'boolean'
    ? Boolean(data.password_reset_available)
    : enabled && emailReady
  return {
    password_reset_enabled: enabled,
    email_delivery_ready: emailReady,
    password_reset_available: available,
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
