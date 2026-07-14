import { preloadRegistrationSettings } from '@/core/cms/adp/js/registrationSettings.js'
import { preloadPasswordResetSettings } from '@/core/cms/adp/js/passwordResetSettings.js'

let preloadPromise = null

/**
 * Предзагрузка настроек регистрации и сброса пароля (только auth-поток).
 */
export function preloadAuthSettings() {
  if (!preloadPromise) {
    preloadPromise = Promise.all([
      preloadRegistrationSettings(),
      preloadPasswordResetSettings(),
    ]).catch(() => {})
  }
  return preloadPromise
}
