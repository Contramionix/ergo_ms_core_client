/**
 * Временный override палитры при высоком контрасте ОС/браузера.
 * Не перезаписывает activeTheme в localStorage.
 */

import {
  THEME_CHANGE_EVENT,
  applyTheme,
  applyThemeModePreference,
  getCurrentThemeMode,
  readThemePreference,
} from '@/js/theme-manager.js'
import { getHighContrastColors } from '@/js/highContrastPalette.js'
import { resolveContrastMore } from '@/js/uiPreferences.js'

let contrastOverrideActive = false
let themeChangeBound = false
let lastAppliedBase = null
let applying = false

function onThemeChangeWhileContrast() {
  if (applying) return
  if (!resolveContrastMore()) return
  const base = getCurrentThemeMode()
  if (contrastOverrideActive && lastAppliedBase === base) return
  applyContrastPaletteOverride()
}

export function applyContrastPaletteOverride() {
  if (typeof document === 'undefined') return
  if (applying) return

  applying = true
  try {
    const baseTheme = getCurrentThemeMode()
    applyTheme(
      {
        name: 'Высокий контраст',
        base_theme: baseTheme,
        colors: getHighContrastColors(baseTheme),
        bootstrap_colors: {},
      },
      false,
    )
    contrastOverrideActive = true
    lastAppliedBase = baseTheme
    ensureThemeChangeListener()
  } finally {
    applying = false
  }
}

export function clearContrastPaletteOverride() {
  if (typeof document === 'undefined') return
  if (!contrastOverrideActive) return

  applying = true
  try {
    contrastOverrideActive = false
    lastAppliedBase = null
    // Тот же путь, что и обычное переключение режима: подбирает точный
    // вариант из закэшированной пары light+dark, если она известна.
    applyThemeModePreference(readThemePreference())
  } finally {
    applying = false
  }
}

export function syncContrastPaletteWithPreference() {
  if (resolveContrastMore()) {
    applyContrastPaletteOverride()
  } else {
    clearContrastPaletteOverride()
  }
}

function ensureThemeChangeListener() {
  if (themeChangeBound || typeof window === 'undefined') return
  themeChangeBound = true
  window.addEventListener(THEME_CHANGE_EVENT, onThemeChangeWhileContrast)
}

export function isContrastOverrideActive() {
  return contrastOverrideActive
}
