import { apiClient } from '@/js/api/manager'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import {
  applyThemeModePreference,
  initTheme,
  readThemePreference,
  saveThemeToLocalStorage,
} from '@/js/theme-manager.js'

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
    is_system: data.is_system,
  }
}

/**
 * Загружает активную тему сайта с API и применяет её.
 * Публичный endpoint — работает и на странице входа.
 */
export async function syncSiteThemeFromApi() {
  await initEndpoints()
  try {
    const res = await apiClient.get(endpoints.themes.active, {}, false)
    if (res.success && res.data && !res.data.detail) {
      const theme = normalizeThemePayload(res.data)
      if (theme) {
        saveThemeToLocalStorage(theme)
        applyThemeModePreference(readThemePreference())
        return theme
      }
    }
  } catch (e) {
    logWarn('Не удалось загрузить активную тему с сервера', e)
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
