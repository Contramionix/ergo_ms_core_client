/**
 * Модульные темы: пара light+dark, вариант по глобальному режиму пользователя.
 */

import {
  buildThemeCss,
  hasCustomColors,
  moduleScopeSelector,
} from './theme-css-builder.js'
import {
  getCurrentThemeMode,
  THEME_CHANGE_EVENT,
} from './theme-manager.js'
import { clearCspStyleSheet, setCspStyleSheet } from './cspStyleSheet.js'
import { logError } from '@/js/utils/logError.js'

const ACTIVE_MODULE_THEMES_KEY = 'activeModuleThemes'
const MODULE_THEME_STYLE_ID = 'module-theme-styles'

export const MODULE_THEME_CHANGE_EVENT = 'ergo:module-theme-change'

let activeModuleKey = null
let cachedModuleSet = null
let themeChangeListenerAttached = false
/** Только для превью в редакторе: принудительный light|dark вместо глобального режима. */
let previewForceMode = null

function notifyModuleThemeChange(moduleKey, baseTheme) {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent(MODULE_THEME_CHANGE_EVENT, {
    detail: { moduleKey, baseTheme },
  }))
}

export function normalizeModuleThemePayload(data) {
  if (!data || typeof data !== 'object') {
    return null
  }
  return {
    id: data.id,
    name: data.name,
    module_key: data.module_key || null,
    module_pair: data.module_pair || 'default',
    base_theme: data.base_theme || 'light',
    colors: data.colors || {},
    bootstrap_colors: data.bootstrap_colors || {},
    module_tokens: data.module_tokens || {},
    is_active: data.is_active,
    is_default: data.is_default,
    is_system: data.is_system,
  }
}

export function normalizeModuleThemeSetPayload(data) {
  if (!data || typeof data !== 'object' || !data.module_key) {
    return null
  }

  if (data.variants) {
    return {
      module_key: data.module_key,
      module_pair: data.module_pair || 'default',
      name: data.name || '',
      is_active: Boolean(data.is_active),
      is_default: Boolean(data.is_default),
      variants: {
        light: data.variants.light
          ? normalizeModuleThemePayload({ ...data.variants.light, module_key: data.module_key, module_pair: data.module_pair })
          : null,
        dark: data.variants.dark
          ? normalizeModuleThemePayload({ ...data.variants.dark, module_key: data.module_key, module_pair: data.module_pair })
          : null,
      },
    }
  }

  const single = normalizeModuleThemePayload(data)
  if (!single?.module_key) {
    return null
  }
  const slot = single.base_theme === 'dark' ? 'dark' : 'light'
  return {
    module_key: single.module_key,
    module_pair: single.module_pair || 'default',
    name: single.name,
    is_active: single.is_active,
    is_default: single.is_default,
    variants: {
      light: slot === 'light' ? single : null,
      dark: slot === 'dark' ? single : null,
    },
  }
}

export function resolveVariantFromSet(themeSet, mode = null) {
  if (!themeSet?.variants) {
    return null
  }
  const resolved = mode || getCurrentThemeMode()
  return themeSet.variants[resolved] || themeSet.variants.light || themeSet.variants.dark
}

function loadModuleThemesCache() {
  try {
    const raw = localStorage.getItem(ACTIVE_MODULE_THEMES_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
    logError('Ошибка загрузки кеша модульных тем:', e)
  }
  return {}
}

export function saveModuleThemeSetToCache(moduleKey, themeSet) {
  if (!moduleKey || !themeSet) {
    return
  }
  try {
    const cache = loadModuleThemesCache()
    cache[moduleKey] = themeSet
    localStorage.setItem(ACTIVE_MODULE_THEMES_KEY, JSON.stringify(cache))
  } catch (e) {
    logError('Ошибка сохранения модульной темы:', e)
  }
}

export function getCachedModuleThemeSet(moduleKey) {
  const cache = loadModuleThemesCache()
  const raw = cache[moduleKey]
  return raw ? normalizeModuleThemeSetPayload(raw) : null
}

export function getActiveModuleKey() {
  return activeModuleKey
}

export function getCachedModuleThemeSetForActive() {
  return activeModuleKey ? getCachedModuleThemeSet(activeModuleKey) : null
}

function resolvePreviewMode() {
  if (previewForceMode === 'light' || previewForceMode === 'dark') {
    return previewForceMode
  }
  return getCurrentThemeMode()
}

function applyResolvedVariant(moduleKey, themeSet) {
  const mode = resolvePreviewMode()
  const variant = resolveVariantFromSet(themeSet, mode)

  if (!variant) {
    clearCspStyleSheet(MODULE_THEME_STYLE_ID)
    notifyModuleThemeChange(moduleKey, mode)
    return
  }

  const scope = moduleScopeSelector(moduleKey)
  const css = buildThemeCss({
    baseTheme: mode,
    colors: variant.colors || {},
    bootstrapColors: variant.bootstrap_colors || {},
    scopeSelector: scope,
    moduleKey,
    moduleTokens: variant.module_tokens || {},
    includeAccentComponentRules: true,
  })

  setCspStyleSheet(MODULE_THEME_STYLE_ID, css)
  notifyModuleThemeChange(moduleKey, mode)
}

function attachGlobalThemeListener() {
  if (themeChangeListenerAttached || typeof window === 'undefined') {
    return
  }
  themeChangeListenerAttached = true
  window.addEventListener(THEME_CHANGE_EVENT, () => {
    if (activeModuleKey && cachedModuleSet) {
      applyResolvedVariant(activeModuleKey, cachedModuleSet)
    }
  })
}

/**
 * Применить пару модульных тем; отображаемый вариант — по глобальному light/dark/auto
 * (или previewForceMode, если задан через previewModuleThemeSet).
 */
export function applyModuleThemeSet(moduleKey, themeSet, options = {}) {
  if (Object.prototype.hasOwnProperty.call(options, 'forceMode')) {
    previewForceMode = options.forceMode === 'light' || options.forceMode === 'dark'
      ? options.forceMode
      : null
  } else if (!options.keepForceMode) {
    previewForceMode = null
  }

  attachGlobalThemeListener()
  activeModuleKey = moduleKey || null
  cachedModuleSet = themeSet ? normalizeModuleThemeSetPayload(themeSet) : null

  if (!moduleKey || !cachedModuleSet) {
    clearCspStyleSheet(MODULE_THEME_STYLE_ID)
    notifyModuleThemeChange(null, null)
    return
  }

  if (!previewForceMode) {
    saveModuleThemeSetToCache(moduleKey, cachedModuleSet)
  }
  applyResolvedVariant(moduleKey, cachedModuleSet)
}

export function clearModuleTheme() {
  previewForceMode = null
  activeModuleKey = null
  cachedModuleSet = null
  clearCspStyleSheet(MODULE_THEME_STYLE_ID)
  notifyModuleThemeChange(null, null)
}

/**
 * Превью в редакторе. forceMode: 'light'|'dark' — показать вариант вкладки, а не глобальный режим.
 */
export function previewModuleThemeSet(moduleKey, themeSet, options = {}) {
  applyModuleThemeSet(moduleKey, themeSet, {
    forceMode: options.forceMode ?? null,
    keepForceMode: Boolean(options.forceMode),
  })
}

export function moduleThemeHasCustomPalette(themeOrSet) {
  const set = normalizeModuleThemeSetPayload(themeOrSet)
  if (!set) {
    return false
  }
  return ['light', 'dark'].some((slot) => {
    const variant = set.variants[slot]
    if (!variant) {
      return false
    }
    const tokens = variant.module_tokens
    const hasTokens = tokens && Object.keys(tokens).some((k) => tokens[k])
    const hasBootstrap = variant.bootstrap_colors
      && Object.keys(variant.bootstrap_colors).some((k) => variant.bootstrap_colors[k])
    return hasCustomColors(variant.colors) || hasBootstrap || hasTokens
  })
}
