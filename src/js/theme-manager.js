/**
 * МЕНЕДЖЕР ТЕМ
 * 
 * Начальные значения берутся ТОЛЬКО из _theme.scss
 * Bootstrap переменные НЕ переопределяются по умолчанию
 */

import { 
  THEME_SCSS_COLORS,
  COLOR_DESCRIPTIONS,
  BOOTSTRAP_VARIABLES,
  getThemeScssColors,
  getBootstrapByCategories as getBootstrapCategories
} from './bootstrap-variables.js'

// Маппинг переменных (--color-*)
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
  accent: '--color-accent'
}

/**
 * Получить начальные цвета из _theme.scss
 */
export function getDefaultColors(baseTheme = 'light') {
  return getThemeScssColors(baseTheme)
}

/**
 * Получить Bootstrap переменные по умолчанию
 * Возвращает ПУСТОЙ объект - используем стандартные Bootstrap + SCSS
 */
export function getDefaultBootstrapColors(baseTheme = 'light') {
  return {}
}

/**
 * Получить структуру темы по умолчанию
 */
export function getDefaultThemeConfig() {
  return {
    light: getDefaultColors('light'),
    dark: getDefaultColors('dark')
  }
}

/**
 * Применить тему к документу
 * @param {Object} theme - объект темы
 * @param {boolean} saveToStorage - сохранять ли в localStorage (по умолчанию true)
 */
export function applyTheme(theme, saveToStorage = true) {
  if (!theme) {
    console.warn('Тема не передана')
    return
  }

  const baseTheme = theme.base_theme || theme.baseTheme || 'light'
  const colors = theme.colors || {}
  // Bootstrap переменные ИГНОРИРУЮТСЯ - используем только SCSS из _theme.scss

  // Устанавливаем data-bs-theme
  document.documentElement.setAttribute('data-bs-theme', baseTheme)

  // Создаём элемент стилей только для кастомных переменных
  let styleElement = document.getElementById('custom-theme-styles')
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'custom-theme-styles'
    document.body.appendChild(styleElement)
  }

  // Проверяем, есть ли кастомные цвета
  const hasCustomColors = Object.keys(colors).some(key => colors[key])
  
  if (!hasCustomColors) {
    // Если нет кастомных цветов - убираем стили, используем SCSS
    styleElement.textContent = ''
    return
  }

  // Формируем CSS для кастомных переменных
  let cssRules = `
    html[data-bs-theme='${baseTheme}'],
    [data-bs-theme='${baseTheme}'] {
  `

  // Добавляем кастомные переменные (--color-*)
  for (const [key, varName] of Object.entries(COLOR_VAR_MAP)) {
    if (colors[key]) {
      cssRules += `  ${varName}: ${colors[key]} !important;\n`
    }
  }

  // Связываем accent с Bootstrap primary для синхронизации кнопок, ссылок и т.д.
  if (colors.accent) {
    const accentHex = colors.accent.replace('#', '')
    const r = parseInt(accentHex.substring(0, 2), 16)
    const g = parseInt(accentHex.substring(2, 4), 16)
    const b = parseInt(accentHex.substring(4, 6), 16)
    
    cssRules += `
      /* Bootstrap primary синхронизация с accent */
      --bs-primary: ${colors.accent} !important;
      --bs-primary-rgb: ${r}, ${g}, ${b} !important;
      --bs-link-color: ${colors.accent} !important;
      --bs-link-color-rgb: ${r}, ${g}, ${b} !important;
      --bs-link-hover-color: ${colors.accent} !important;
    `
  }

  cssRules += '}\n'
  
  // Добавляем стили для кнопок с primary цветом
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
  
  // Сохраняем только если явно указано
  if (saveToStorage) {
    saveThemeToLocalStorage(theme)
  }
}

/**
 * Применить тему как превью (БЕЗ сохранения в localStorage)
 */
export function previewTheme(theme) {
  applyTheme(theme, false)
}

/**
 * Получить текущий режим темы
 */
export function getCurrentThemeMode() {
  const stored = localStorage.getItem('theme')
  if (!stored) {
    return 'light'
  }
  if (stored === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return stored
}

/**
 * Сбросить тему к начальным значениям из _theme.scss
 */
export function resetToInitialTheme(baseTheme = null) {
  const mode = baseTheme || getCurrentThemeMode()
  
  // Удаляем кастомные стили
  const styleElement = document.getElementById('custom-theme-styles')
  if (styleElement) {
    styleElement.textContent = ''
  }
  
  // Устанавливаем атрибут - SCSS применится автоматически
  document.documentElement.setAttribute('data-bs-theme', mode)
  
  // Очищаем localStorage
  localStorage.removeItem('activeTheme')
  
  return {
    base_theme: mode,
    colors: getDefaultColors(mode),
    bootstrap_colors: {}
  }
}

/**
 * Сбросить тему
 */
export function resetTheme() {
  return resetToInitialTheme()
}

/**
 * Сохранить тему в localStorage
 */
export function saveThemeToLocalStorage(theme) {
  try {
    localStorage.setItem('activeTheme', JSON.stringify(theme))
  } catch (e) {
    console.error('Ошибка сохранения темы:', e)
  }
}

/**
 * Загрузить тему из localStorage
 */
export function loadThemeFromLocalStorage() {
  try {
    const stored = localStorage.getItem('activeTheme')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Ошибка загрузки темы:', e)
  }
  return null
}

/**
 * Инициализация темы при загрузке страницы
 */
export function initTheme() {
  const savedTheme = loadThemeFromLocalStorage()
  
  if (savedTheme && savedTheme.colors && Object.keys(savedTheme.colors).length > 0) {
    // Применяем сохранённую тему без перезаписи localStorage
    applyTheme(savedTheme, false)
  } else {
    // Нет сохранённой темы - используем SCSS из _theme.scss
    const mode = getCurrentThemeMode()
    document.documentElement.setAttribute('data-bs-theme', mode)
  }

  // Слушаем изменения системной темы только если нет кастомной темы
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const stored = localStorage.getItem('theme')
    const savedTheme = loadThemeFromLocalStorage()
    
    // Если есть кастомная тема - не реагируем на системную тему
    if (savedTheme && savedTheme.colors && Object.keys(savedTheme.colors).length > 0) {
      return
    }
    
    if (stored === 'auto') {
      const mode = e.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-bs-theme', mode)
    }
  })
}

/**
 * Описания цветов для UI редактора
 */
export function getColorDescriptions() {
  return COLOR_DESCRIPTIONS
}

/**
 * Bootstrap переменные по категориям для UI редактора
 */
export function getBootstrapByCategories() {
  return getBootstrapCategories()
}

/**
 * Описания Bootstrap переменных
 */
export function getBootstrapColorDescriptions() {
  const descriptions = {}
  for (const [categoryKey, category] of Object.entries(BOOTSTRAP_VARIABLES)) {
    for (const [key, config] of Object.entries(category.variables)) {
      descriptions[key] = {
        label: config.label,
        description: config.variable
      }
    }
  }
  return descriptions
}

/**
 * Совместимость со старым API
 */
export function applyCurrentTheme() {
  initTheme()
}

export function applyThemeConfig(themeConfig, themeMode = null) {
  if (!themeConfig) return
  const mode = themeMode || getCurrentThemeMode()
  const colors = themeConfig[mode] || themeConfig.light || {}
  applyTheme({ base_theme: mode, colors, bootstrap_colors: {} })
}
