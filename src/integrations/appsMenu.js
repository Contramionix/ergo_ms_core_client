/**
 * Реестр пунктов меню приложений (AppsMenu в toolbar).
 *
 * Модули регистрируют приложения через bridge.provideMany(APPS_MENU_ITEMS_GROUP, ...).
 * Ядро собирает их через collectVisibleAppsMenuItems().
 *
 * Пункт может открывать маршрут (`route`) и/или выполнять действие (`onClick`) —
 * например offcanvas мини-чат без смены URL.
 *
 * Иконка — строка Lucide PascalCase (`icon: 'Bot'`); рендер в AppsMenu через LucideIcon.
 */

import bridge from '@/integrations/ModuleBridge.js'
import { APPS_MENU_ITEMS_GROUP } from '@/integrations/moduleContracts.js'
import { moduleManager } from '@/modules/index.js'
import { whenSessionReady } from '@/js/sessionReady.js'
import { getAccess } from '@/core/cms/js/tokenStorage.js'
import { normalizeLucideIconName } from '@/js/lucideIconLoader.js'
import {
  getPermissionsSnapshot,
  hasModulePermission,
} from '@/core/cms/adp/js/accessControl.js'

export { APPS_MENU_ITEMS_GROUP }

/**
 * @typedef {Object} AppsMenuItem
 * @property {string} id
 * @property {number} [order]
 * @property {string} title
 * @property {string|null} [icon] — Lucide PascalCase
 * @property {import('vue-router').RouteLocationRaw} [route]
 * @property {() => void | Promise<void>} [onClick]
 * @property {string} [permissionModule] — UX: скрыть без права (глобальный админ видит)
 * @property {string} [permission]
 * @property {() => boolean | Promise<boolean>} [isVisible] — доп. UX-проверка
 */

/**
 * null — сессия/снимок прав ещё не готовы (AppsMenu должен повторить, а не спрятать кнопку).
 * @returns {Promise<AppsMenuItem[]|null>}
 */
function resolveItemTitle(item) {
  try {
    const title = typeof item.title === 'function' ? item.title() : item.title
    if (typeof title === 'string' && title.trim()) {
      return title
    }
  } catch {
    /* ключ локали модуля может ещё не быть в каталоге */
  }
  return item.id
}

/**
 * @param {object} item
 * @returns {Promise<boolean>}
 */
async function isAppsMenuItemAllowed(item) {
  if (typeof item.isVisible === 'function') {
    return Boolean(await item.isVisible())
  }
  if (item.permissionModule && item.permission) {
    return hasModulePermission(item.permissionModule, item.permission)
  }
  return true
}

export async function collectVisibleAppsMenuItems() {
  await whenSessionReady()
  if (!getAccess()) {
    return null
  }

  const snapshot = await getPermissionsSnapshot()
  if (!snapshot) {
    // Как в 18518be: пустой снимок ≠ «прав нет» — иначе всё скрыто до F5.
    return null
  }

  await moduleManager.ensureInitialized()
  if (typeof moduleManager.retryMissingRemotes === 'function') {
    await moduleManager.retryMissingRemotes()
  }

  const items = Object.values(bridge.all(APPS_MENU_ITEMS_GROUP)).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  )

  const visible = []

  for (const item of items) {
    if (!item?.id) {
      continue
    }
    const hasRoute = Boolean(item.route)
    const hasAction = typeof item.onClick === 'function'
    if (!hasRoute && !hasAction) {
      continue
    }
    if (!(await isAppsMenuItemAllowed(item))) {
      continue
    }
    visible.push({
      id: item.id,
      name: item.id,
      order: item.order ?? 0,
      title: resolveItemTitle(item),
      icon: normalizeLucideIconName(item.icon),
      route: item.route || null,
      onClick: hasAction ? item.onClick : null,
    })
  }

  return visible
}
