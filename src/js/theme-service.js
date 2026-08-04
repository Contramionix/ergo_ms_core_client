import { apiClient } from '@/js/api/manager'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import { isMaintenanceResponse } from '@/composables/useMaintenanceMode.js'
import { logWarn } from '@/js/utils/logError.js'
import {
  applyThemeModePreference,
  initTheme,
  readThemePreference,
  resolveThemeMode,
  saveSiteThemePairToCache,
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

/** Ответ /themes/active/ (сайт): пара {pair_key, name, is_default, variants: {light, dark}}. */
function normalizeSiteThemePairPayload(data) {
  if (!data || typeof data !== 'object' || !data.variants) {
    return null
  }
  return {
    pair_key: data.pair_key || null,
    name: data.name || '',
    is_default: Boolean(data.is_default),
    variants: {
      light: data.variants.light ? normalizeThemePayload(data.variants.light) : null,
      dark: data.variants.dark ? normalizeThemePayload(data.variants.dark) : null,
    },
  }
}

/**
 * Загружает эффективную тему (пару light+dark) с API и применяет её.
 * Для авторизованного — личная палитра или стандарт сайта; для анонима — стандарт.
 * Публичный endpoint — работает и на странице входа.
 *
 * Сервер возвращает пару вариантов — кэшируем её целиком (для точного
 * подбора при последующей смене режима) и применяем вариант под текущий
 * режим шестерёнки (localStorage `theme`), а не только под base_theme темы.
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
      const pair = normalizeSiteThemePairPayload(res.data)
      const anchorVariant = pair?.variants.light || pair?.variants.dark
      if (pair && anchorVariant) {
        saveSiteThemePairToCache(pair)
        const stored = localStorage.getItem('theme')
        const preference = (stored && THEME_MODES.includes(stored))
          ? stored
          : (anchorVariant.base_theme === 'dark' ? 'dark' : readThemePreference())
        const resolvedMode = resolveThemeMode(preference)
        const variant = pair.variants[resolvedMode] || anchorVariant
        saveThemeToLocalStorage(variant)
        applyThemeModePreference(preference)
        return variant
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
