/**
 * Категории системных тем.
 * Имена синхронизировать с ACCESSIBILITY_THEME_BASE_NAMES в
 * core/api/src/core/settings/services/theme_seed.py
 */

export const ACCESSIBILITY_THEME_BASE_NAMES = Object.freeze([
  'Высокий контраст',
  'Тёплый свет',
  'Ясные · RG',
  'Мягкие · BY',
  'Монохром',
])

const DARK_SUFFIX = ' · тёмная'
const A11Y_BASE_SET = new Set(ACCESSIBILITY_THEME_BASE_NAMES)

export function isAccessibilityTheme(name) {
  const raw = String(name || '').trim()
  if (!raw) {
    return false
  }
  if (A11Y_BASE_SET.has(raw)) {
    return true
  }
  if (raw.endsWith(DARK_SUFFIX)) {
    return A11Y_BASE_SET.has(raw.slice(0, -DARK_SUFFIX.length))
  }
  return false
}

/**
 * Готовое представление темы для карточки галереи (один расчёт на тему).
 */
export function resolveThemePresentation(theme, fallbackColors = null) {
  if (theme?.is_pair && theme.variants) {
    const light = theme.variants.light?.colors || {}
    const dark = theme.variants.dark?.colors || {}
    return {
      dual: true,
      isAccessibility: isAccessibilityTheme(theme.name),
      accent: light.accent || dark.accent || '#888',
      light: [
        light.background || '#f5f5f5',
        light.primaryBackground || '#fff',
        light.secondaryBackground || '#eee',
        light.primaryText || '#222',
        light.accent || '#888',
      ],
      dark: [
        dark.background || '#1a1a1a',
        dark.primaryBackground || '#2a2a2a',
        dark.secondaryBackground || '#333',
        dark.primaryText || '#eee',
        dark.accent || '#888',
      ],
      preview: {
        background: light.background || dark.background || '#f5f5f5',
        header: light.headerBackground || light.primaryBackground || '#fff',
        card: light.primaryBackground || '#fff',
        text: light.primaryText || '#222',
        muted: light.secondaryText || '#666',
        accent: light.accent || dark.accent || '#888',
        border: light.border || '#ddd',
      },
    }
  }

  let colors = theme?.colors
  if ((!colors || !Object.keys(colors).length) && fallbackColors) {
    colors = fallbackColors
  }
  colors = colors || {}

  return {
    dual: false,
    isAccessibility: isAccessibilityTheme(theme?.name),
    accent: colors.accent || '#888',
    colors: [
      colors.background || '#f5f5f5',
      colors.primaryBackground || '#fff',
      colors.secondaryBackground || '#eee',
      colors.primaryText || '#222',
      colors.accent || '#888',
      colors.border || '#ddd',
    ],
    preview: {
      background: colors.background || '#f5f5f5',
      header: colors.headerBackground || colors.primaryBackground || '#fff',
      card: colors.primaryBackground || '#fff',
      text: colors.primaryText || '#222',
      muted: colors.secondaryText || '#666',
      accent: colors.accent || '#888',
      border: colors.border || '#ddd',
    },
  }
}
