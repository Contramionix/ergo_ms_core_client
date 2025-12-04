/**
 * НАЧАЛЬНЫЕ ЦВЕТА ТЕМ
 * 
 * Все начальные значения берутся ТОЛЬКО из _theme.scss
 * Bootstrap переменные НЕ переопределяются по умолчанию
 */

/**
 * Начальные цвета из _theme.scss
 * Это ЕДИНСТВЕННЫЙ источник начальных значений
 */
export const THEME_SCSS_COLORS = {
  light: {
    // Светлая тема из _theme.scss
    headerBackground: 'rgba(255, 255, 255, 0.85)',
    authBackground: 'rgba(255, 255, 255, 0.7)',
    background: '#f2f2f2',
    border: '#e0e0e0',
    primaryText: '#101223',
    secondaryText: '#6e6e6e',
    primaryBackground: '#ffffff',
    secondaryBackground: '#f1f1f1',
    hoverBackground: '#e1e1e1',
    accent: '#d0322d'
  },
  dark: {
    // Тёмная тема из _theme.scss
    headerBackground: 'rgba(30, 30, 30, 0.85)',
    authBackground: 'rgba(30, 30, 30, 0.7)',
    background: '#111112',
    border: '#555555',
    primaryText: '#c9cccf',
    secondaryText: '#6e6e6e',
    primaryBackground: '#18181a',
    secondaryBackground: '#2a2a2c',
    hoverBackground: '#3d3d3f',
    accent: '#f14336'
  }
}

/**
 * Описания переменных для редактора тем
 */
export const COLOR_DESCRIPTIONS = {
  headerBackground: { label: 'Фон шапки', variable: '--color-header-background' },
  authBackground: { label: 'Фон авторизации', variable: '--color-auth-background' },
  background: { label: 'Основной фон', variable: '--color-background' },
  border: { label: 'Цвет границ', variable: '--color-border' },
  primaryText: { label: 'Основной текст', variable: '--color-primary-text' },
  secondaryText: { label: 'Вторичный текст', variable: '--color-secondary-text' },
  primaryBackground: { label: 'Фон элементов', variable: '--color-primary-background' },
  secondaryBackground: { label: 'Вторичный фон', variable: '--color-secondary-background' },
  hoverBackground: { label: 'Фон при наведении', variable: '--color-hover-background' },
  accent: { label: 'Акцентный цвет', variable: '--color-accent' }
}

/**
 * Bootstrap переменные для ДОПОЛНИТЕЛЬНОЙ настройки (опционально)
 * Эти переменные НЕ применяются по умолчанию - используются стандартные Bootstrap + SCSS
 */
export const BOOTSTRAP_VARIABLES = {
  theme: {
    label: 'Цвета Bootstrap',
    variables: {
      primary: { label: 'Primary', variable: '--bs-primary' },
      secondary: { label: 'Secondary', variable: '--bs-secondary' },
      success: { label: 'Success', variable: '--bs-success' },
      info: { label: 'Info', variable: '--bs-info' },
      warning: { label: 'Warning', variable: '--bs-warning' },
      danger: { label: 'Danger', variable: '--bs-danger' }
    }
  },
  links: {
    label: 'Ссылки',
    variables: {
      linkColor: { label: 'Цвет ссылок', variable: '--bs-link-color' },
      linkHoverColor: { label: 'При наведении', variable: '--bs-link-hover-color' }
    }
  },
  body: {
    label: 'Страница',
    variables: {
      bodyBg: { label: 'Фон страницы', variable: '--bs-body-bg' },
      bodyColor: { label: 'Цвет текста', variable: '--bs-body-color' }
    }
  },
  cards: {
    label: 'Карточки',
    variables: {
      cardBg: { label: 'Фон карточки', variable: '--bs-card-bg' }
    }
  }
}

/**
 * Получить начальные цвета из _theme.scss
 */
export function getThemeScssColors(theme = 'light') {
  return { ...THEME_SCSS_COLORS[theme] || THEME_SCSS_COLORS.light }
}

/**
 * Получить Bootstrap переменные по умолчанию
 * Возвращает ПУСТОЙ объект - Bootstrap переменные не переопределяются изначально
 */
export function getBootstrapDefaults() {
  return {}
}

/**
 * Получить Bootstrap переменные по категориям для UI редактора
 */
export function getBootstrapByCategories() {
  return BOOTSTRAP_VARIABLES
}

/**
 * Преобразовать объект с ключами в CSS переменные
 */
export function valuesToCss(values) {
  if (!values || Object.keys(values).length === 0) return ''
  
  let css = ''
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue
    
    for (const category of Object.values(BOOTSTRAP_VARIABLES)) {
      if (category.variables[key]) {
        css += `  ${category.variables[key].variable}: ${value} !important;\n`
        break
      }
    }
  }
  return css
}

export default THEME_SCSS_COLORS
