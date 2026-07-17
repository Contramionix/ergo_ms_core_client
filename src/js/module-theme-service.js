import { clearModuleTheme } from '@/js/module-theme-manager.js'

/**
 * Модульные палитры отключены: активная тема всегда глобальная (сайт).
 * Обёртка ModuleThemeScope сохраняет data-ergo-module-theme для SCSS-алиасов,
 * но отдельный #module-theme-styles не подгружается.
 *
 * @param {string|null} _moduleKey
 */
export async function syncModuleThemeFromApi(_moduleKey) {
  clearModuleTheme()
  return null
}

/**
 * @param {string|null} _moduleKey — из route.meta.moduleKey (игнорируется)
 */
export async function handleRouteModuleTheme(_moduleKey) {
  clearModuleTheme()
  return null
}
