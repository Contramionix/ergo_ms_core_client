/**
 * Канонические Lucide-имена для общих смыслов UI ядра.
 * Модули и декларации не подбирают «похожие» глифы сами — берут отсюда
 * или передают тот же PascalCase, что в меню/миграциях.
 *
 * Рендер — только через LucideIcon / lucideIconLoader (см. icons.mdc).
 */

/** Единая толщина обводки Lucide в оболочке и декларативных списках */
export const LUCIDE_STROKE_WIDTH = 2

export const CORE_ICON = Object.freeze({
  profile: 'CircleUserRound',
  security: 'Shield',
  notifications: 'Bell',
  notificationsOff: 'BellOff',
  system: 'Monitor',
  themes: 'Palette',
  themeContrast: 'Contrast',
  toasts: 'MessageSquareText',
  apps: 'Grid3x3',
  settings: 'Settings',
  settingsCog: 'Settings',
  logout: 'Power',
  language: 'Languages',
  themeLight: 'Sun',
  themeDark: 'Moon',
  themeAuto: 'LaptopMinimal',
})
