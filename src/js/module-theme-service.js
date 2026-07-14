import { apiClient } from '@/js/api/manager'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import {
  applyModuleThemeSet,
  clearModuleTheme,
  getCachedModuleThemeSet,
  normalizeModuleThemeSetPayload,
  saveModuleThemeSetToCache,
} from '@/js/module-theme-manager.js'
import { isModuleThemeRegistered } from '@/modules/themes/ThemeDefaultsManager.js'

/**
 * @param {string|null} moduleKey
 */
export async function syncModuleThemeFromApi(moduleKey) {
  if (!moduleKey) {
    clearModuleTheme()
    return null
  }

  if (!await isModuleThemeRegistered(moduleKey)) {
    clearModuleTheme()
    return null
  }

  await initEndpoints()

  const res = await apiClient.get(
    endpoints.themes.active,
    { module: moduleKey },
    false,
    { quietStatuses: [404] },
  )

  if (res.success && res.data && !res.data.detail) {
    const themeSet = normalizeModuleThemeSetPayload(res.data)
    if (themeSet) {
      saveModuleThemeSetToCache(moduleKey, themeSet)
      applyModuleThemeSet(moduleKey, themeSet)
      return themeSet
    }
  }

  const cached = getCachedModuleThemeSet(moduleKey)
  if (cached) {
    applyModuleThemeSet(moduleKey, cached)
    return cached
  }

  clearModuleTheme()
  return null
}

/**
 * @param {string|null} moduleKey — из route.meta.moduleKey
 */
export async function handleRouteModuleTheme(moduleKey) {
  if (!moduleKey) {
    clearModuleTheme()
    return null
  }
  return syncModuleThemeFromApi(moduleKey)
}
