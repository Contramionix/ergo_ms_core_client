/**
 * Предпочтения браузерных (OS) уведомлений.
 */

export const BROWSER_NOTIFICATION_PREFS = {
  enabled: 'ergo-browser-notifications-enabled',
  privacy: 'ergo-browser-notifications-private',
  sound: 'ergo-browser-notifications-sound',
}

export const BROWSER_NOTIFICATION_PREFS_CHANGED = 'ergo:browser-notification-prefs'

export function readBrowserNotificationPref(key, fallback = false) {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value === 'true'
  } catch {
    return fallback
  }
}

export function writeBrowserNotificationPref(key, value) {
  try {
    window.localStorage.setItem(key, String(Boolean(value)))
  } catch {
    // Настройка остаётся в памяти до перезагрузки, если storage недоступен.
  }
  try {
    window.dispatchEvent(new CustomEvent(BROWSER_NOTIFICATION_PREFS_CHANGED, {
      detail: { key, value: Boolean(value) },
    }))
  } catch {
    // ignore
  }
}
