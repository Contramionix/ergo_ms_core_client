/**
 * Гибридное определение имени иконки уведомления.
 *
 * Приоритет:
 *   1. notification.icon (явно от модуля-источника)
 *   2. LEVEL_ICON_MAP[level]
 *   3. дефолт 'Bell'
 *
 * Возвращается строка — имя компонента из lucide-vue-next (PascalCase),
 * пригодная для moduleManager.icons.getIcon(name).
 */

export const LEVEL_ICON_MAP = {
  info: 'Info',
  success: 'CheckCircle2',
  warning: 'AlertTriangle',
  error: 'AlertOctagon',
}

const DEFAULT_ICON = 'Bell'

export function resolveNotificationIconName(item) {
  if (!item || typeof item !== 'object') return DEFAULT_ICON

  if (typeof item.icon === 'string' && item.icon.trim()) {
    return item.icon.trim()
  }

  const level = (item.level || '').toString().trim()
  if (level && LEVEL_ICON_MAP[level]) {
    return LEVEL_ICON_MAP[level]
  }

  return DEFAULT_ICON
}
