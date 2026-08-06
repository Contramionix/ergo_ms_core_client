/**
 * Гибридное определение имени иконки уведомления.
 *
 * Приоритет:
 *   1. notification.icon (явно от модуля-источника)
 *   2. LEVEL_ICON_MAP[level]
 *   3. дефолт 'Bell'
 *
 * Возвращается каноническая строка Lucide PascalCase для LucideIcon.
 */

import { CORE_ICON } from '@/config/coreIconNames.js'
import { normalizeLucideIconName } from '@/js/lucideIconLoader.js'

export const LEVEL_ICON_MAP = {
  info: 'Info',
  success: 'CheckCircle2',
  warning: 'AlertTriangle',
  error: 'AlertOctagon',
}

const DEFAULT_ICON = CORE_ICON.notifications

export function resolveNotificationIconName(item) {
  if (!item || typeof item !== 'object') return DEFAULT_ICON

  if (typeof item.icon === 'string' && item.icon.trim()) {
    return normalizeLucideIconName(item.icon) || DEFAULT_ICON
  }

  const level = (item.level || '').toString().trim()
  if (level && LEVEL_ICON_MAP[level]) {
    return LEVEL_ICON_MAP[level]
  }

  return DEFAULT_ICON
}
