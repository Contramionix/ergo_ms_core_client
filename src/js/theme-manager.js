/**
 * Менеджер тем: применение цветов к DOM, кеш в localStorage, режим light/dark/auto.
 * Начальные значения — из bootstrap-variables.js (синхронизированы с _theme.scss).
 */

import {
  COLOR_DESCRIPTIONS,
  BOOTSTRAP_VARIABLES,
  getThemeScssColors,
  getBootstrapByCategories as getBootstrapCategories,
  valuesToCss,
} from './bootstrap-variables.js'

const THEME_STORAGE_KEY = 'theme'
const ACTIVE_THEME_STORAGE_KEY = 'activeTheme'

export const THEME_MODES = ['light', 'dark', 'auto']

const COLOR_VAR_MAP = {
  headerBackground: '--color-header-background',
  authBackground: '--color-auth-background',
  background: '--color-background',
  border: '--color-border',
  primaryText: '--color-primary-text',
  secondaryText: '--color-secondary-text',
  primaryBackground: '--color-primary-background',
  secondaryBackground: '--color-secondary-background',
  hoverBackground: '--color-hover-background',
  accent: '--color-accent',
}

const BOOTSTRAP_BRIDGE_FROM_COLORS = {
  background: ['--bs-body-bg'],
  primaryText: ['--bs-body-color', '--bs-emphasis-color', '--bs-heading-color', '--bs-card-color'],
  secondaryText: ['--bs-secondary-color', '--bs-tertiary-color'],
  border: ['--bs-border-color'],
  primaryBackground: ['--bs-card-bg'],
  secondaryBackground: ['--bs-secondary-bg', '--bs-tertiary-bg'],
  accent: ['--bs-primary', '--bs-link-color', '--bs-link-hover-color'],
}

function hasCustomColors(colors) {
  return colors && Object.keys(colors).some((key) => colors[key])
}

function parseAccentRgb(accent) {
  if (!accent || typeof accent !== 'string') {
    return null
  }

  const hex = accent.trim()
  if (hex.startsWith('#') && hex.length >= 7) {
    const raw = hex.replace('#', '')
    return {
      r: parseInt(raw.substring(0, 2), 16),
      g: parseInt(raw.substring(2, 4), 16),
      b: parseInt(raw.substring(4, 6), 16),
    }
  }

  const rgbMatch = hex.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    }
  }

  return null
}

export function readThemePreference() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored && THEME_MODES.includes(stored)) {
    return stored
  }

  const envDefault = (import.meta?.env?.VITE_DEFAULT_THEME || '').toString().toLowerCase()
  if (envDefault && THEME_MODES.includes(envDefault)) {
    return envDefault
  }

  return 'auto'
}

export function writeThemePreference(mode) {
  if (!THEME_MODES.includes(mode)) return
  localStorage.setItem(THEME_STORAGE_KEY, mode)
}

export function resolveThemeMode(mode) {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function getDefaultColors(baseTheme = 'light') {
  return getThemeScssColors(baseTheme)
}

export function getDefaultThemeConfig() {
  return {
    light: getDefaultColors('light'),
    dark: getDefaultColors('dark'),
  }
}

export function applyBootstrapThemeMode(mode) {
  const resolved = resolveThemeMode(mode)
  document.documentElement.setAttribute('data-bs-theme', resolved)

  const styleElement = document.getElementById('custom-theme-styles')
  if (styleElement) {
    styleElement.textContent = ''
  }
}

function resolveColorsForAppearanceMode(savedTheme, resolvedMode) {
  const savedBase = savedTheme.base_theme || savedTheme.baseTheme || 'light'
  if (savedBase === resolvedMode) {
    return savedTheme.colors
  }

  const defaults = getDefaultColors(resolvedMode)
  const savedAccent = savedTheme.colors?.accent
  const savedBaseAccent = getDefaultColors(savedBase).accent

  if (savedAccent && savedAccent !== savedBaseAccent) {
    return { ...defaults, accent: savedAccent }
  }

  return defaults
}

/**
 * Применить предпочтение light/dark/auto с учётом активной кастомной темы.
 * Режим из шестерёнки всегда задаёт data-bs-theme; палитра подстраивается под него.
 */
export function applyThemeModePreference(mode) {
  writeThemePreference(mode)
  const resolvedMode = resolveThemeMode(mode)
  const savedTheme = loadThemeFromLocalStorage()

  if (savedTheme && hasCustomColors(savedTheme.colors)) {
    applyTheme(
      {
        ...savedTheme,
        base_theme: resolvedMode,
        colors: resolveColorsForAppearanceMode(savedTheme, resolvedMode),
      },
      false,
    )
    return
  }

  applyBootstrapThemeMode(mode)
}

export function applyTheme(theme, saveToStorage = true) {
  if (!theme) {
    logWarn('Тема не передана')
    return
  }

  const preference = readThemePreference()
  const baseTheme = theme.base_theme || theme.baseTheme || resolveThemeMode(preference)
  const colors = theme.colors || {}
  const bootstrapColors = theme.bootstrap_colors || theme.bootstrapColors || {}

  document.documentElement.setAttribute('data-bs-theme', baseTheme)

  let styleElement = document.getElementById('custom-theme-styles')
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'custom-theme-styles'
    document.body.appendChild(styleElement)
  }

  const hasColors = hasCustomColors(colors)
  const hasBootstrap = bootstrapColors && Object.keys(bootstrapColors).some((key) => bootstrapColors[key])

  if (!hasColors && !hasBootstrap) {
    styleElement.textContent = ''
    if (saveToStorage) {
      saveThemeToLocalStorage(theme)
    }
    return
  }

  let cssRules = `
    html[data-bs-theme='${baseTheme}'],
    [data-bs-theme='${baseTheme}'] {
  `

  for (const [key, varName] of Object.entries(COLOR_VAR_MAP)) {
    if (colors[key]) {
      cssRules += `  ${varName}: ${colors[key]} !important;\n`
      const bridgeVars = BOOTSTRAP_BRIDGE_FROM_COLORS[key]
      if (bridgeVars) {
        for (const bsVar of bridgeVars) {
          cssRules += `  ${bsVar}: ${colors[key]} !important;\n`
        }
      }
    }
  }

  if (hasBootstrap) {
    cssRules += valuesToCss(bootstrapColors)
  }

  if (colors.accent) {
    const rgb = parseAccentRgb(colors.accent)
    if (rgb) {
      cssRules += `
      --bs-primary: ${colors.accent} !important;
      --bs-primary-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b} !important;
      --bs-link-color: ${colors.accent} !important;
      --bs-link-color-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b} !important;
      --bs-link-hover-color: ${colors.accent} !important;
    `
    }
  }

  cssRules += '}\n'

  if (colors.accent) {
    cssRules += `
    .btn-primary {
      --bs-btn-bg: ${colors.accent} !important;
      --bs-btn-border-color: ${colors.accent} !important;
      --bs-btn-hover-bg: ${colors.accent} !important;
      --bs-btn-hover-border-color: ${colors.accent} !important;
      --bs-btn-active-bg: ${colors.accent} !important;
      --bs-btn-active-border-color: ${colors.accent} !important;
    }
    .btn-outline-primary {
      --bs-btn-color: ${colors.accent} !important;
      --bs-btn-border-color: ${colors.accent} !important;
      --bs-btn-hover-bg: ${colors.accent} !important;
      --bs-btn-hover-border-color: ${colors.accent} !important;
      --bs-btn-active-bg: ${colors.accent} !important;
      --bs-btn-active-border-color: ${colors.accent} !important;
    }
    .text-primary {
      color: ${colors.accent} !important;
    }
    a {
      color: ${colors.accent};
    }
    a:hover {
      color: ${colors.accent};
      filter: brightness(0.85);
    }
    `
  }

  styleElement.textContent = cssRules

  if (saveToStorage) {
    saveThemeToLocalStorage(theme)
  }
}

export function previewTheme(theme) {
  applyTheme(theme, false)
}

export function getCurrentThemeMode() {
  return resolveThemeMode(readThemePreference())
}

/**
 * Сброс превью редактора к SCSS-дефолтам (не трогает global activeTheme).
 */
export function resetPreviewToDefaults(baseTheme = 'light') {
  const styleElement = document.getElementById('custom-theme-styles')
  if (styleElement) {
    styleElement.textContent = ''
  }
  document.documentElement.setAttribute('data-bs-theme', baseTheme)
  return {
    base_theme: baseTheme,
    colors: getDefaultColors(baseTheme),
    bootstrap_colors: {},
  }
}

export function resetToInitialTheme(baseTheme = null) {
  const mode = baseTheme || getCurrentThemeMode()
  const styleElement = document.getElementById('custom-theme-styles')
  if (styleElement) {
    styleElement.textContent = ''
  }
  document.documentElement.setAttribute('data-bs-theme', mode)
  localStorage.removeItem(ACTIVE_THEME_STORAGE_KEY)
  applyThemeModePreference(readThemePreference())
  return {
    base_theme: mode,
    colors: getDefaultColors(mode),
    bootstrap_colors: {},
  }
}

export function resetTheme() {
  return resetToInitialTheme()
}

export function saveThemeToLocalStorage(theme) {
  try {
    localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, JSON.stringify(theme))
  } catch (e) {
    logError('Ошибка сохранения темы:', e)
  }
}

export function loadThemeFromLocalStorage() {
  try {
    const stored = localStorage.getItem(ACTIVE_THEME_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    logError('Ошибка загрузки темы:', e)
  }
  return null
}

export function clearCachedActiveTheme() {
  localStorage.removeItem(ACTIVE_THEME_STORAGE_KEY)
}

let systemThemeListenerAttached = false

function attachSystemThemeListener() {
  if (systemThemeListenerAttached) {
    return
  }
  systemThemeListenerAttached = true

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readThemePreference() !== 'auto') {
      return
    }
    applyThemeModePreference('auto')
  })
}

export function initTheme() {
  attachSystemThemeListener()
  applyThemeModePreference(readThemePreference())
}

export function getColorDescriptions() {
  return COLOR_DESCRIPTIONS
}

export function getBootstrapByCategories() {
  return getBootstrapCategories()
}

export function getBootstrapColorDescriptions() {
  const descriptions = {}
  for (const category of Object.values(BOOTSTRAP_VARIABLES)) {
    for (const [key, config] of Object.entries(category.variables)) {
      descriptions[key] = {
        label: config.label,
        description: config.variable,
      }
    }
  }
  return descriptions
}
