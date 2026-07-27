import { apiClient } from '@/js/api/manager'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import { isMaintenanceResponse } from '@/composables/useMaintenanceMode.js'
import { logWarn } from '@/js/utils/logError.js'
import {
  applyThemeModePreference,
  initTheme,
  readThemePreference,
  saveThemeToLocalStorage,
  THEME_MODES,
} from '@/js/theme-manager.js'
import { whenSessionReady } from '@/js/sessionReady.js'

function normalizeThemePayload(data) {
  if (!data || typeof data !== 'object') {
    return null
  }
  return {
    id: data.id,
    name: data.name,
    module_key: data.module_key || null,
    base_theme: data.base_theme || 'light',
    colors: data.colors || {},
    bootstrap_colors: data.bootstrap_colors || {},
    module_tokens: data.module_tokens || {},
    is_active: data.is_active,
    is_default: data.is_default,
    is_available: data.is_available,
    is_system: data.is_system,
  }
}

/**
 * Загружает эффективную тему с API и применяет её.
 * Для авторизованного — личная палитра или стандарт сайта; для анонима — стандарт.
 * Публичный endpoint — работает и на странице входа.
 *
 * Режим — из шестерёнки (localStorage `theme`). Палитра
 * подстраивается под него. Явной записи в localStorage ещё нет — берём
 * base_theme темы, чтобы тёмная палитра не схлопывалась в light.
 */
export async function syncSiteThemeFromApi() {
  await initEndpoints()
  // Access только в памяти: на F5 сначала restoreSession, иначе active/ без JWT
  // вернёт стандарт сайта и затрёт личную палитру в localStorage.
  await whenSessionReady()
  try {
    // needToken=true: для авторизованного — личная палитра; без токена — стандарт сайта.
    const res = await apiClient.get(endpoints.themes.active, {}, true)
    if (res.success && res.data && !res.data.detail) {
      const theme = normalizeThemePayload(res.data)
      if (theme) {
        saveThemeToLocalStorage(theme)
        const stored = localStorage.getItem('theme')
        const preference = (stored && THEME_MODES.includes(stored))
          ? stored
          : (theme.base_theme === 'dark' ? 'dark' : readThemePreference())
        applyThemeModePreference(preference)
        return theme
      }
    }
  } catch (e) {
    if (!isMaintenanceResponse(e)) {
      logWarn('Не удалось загрузить активную тему с сервера', e)
    }
  }

  initTheme()
  return null
}

/** Восстанавливает активную тему сайта после редактора (превью не сохраняется). */
export async function restoreSiteThemeAfterEditor() {
  const { clearModuleTheme } = await import('@/js/module-theme-manager.js')
  clearModuleTheme()
  return syncSiteThemeFromApi()
}
