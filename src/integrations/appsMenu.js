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

export { APPS_MENU_ITEMS_GROUP }

/**
 * @typedef {Object} AppsMenuItem
 * @property {string} id
 * @property {number} [order]
 * @property {string} title
 * @property {string|null} [icon] — Lucide PascalCase
 * @property {import('vue-router').RouteLocationRaw} [route]
 * @property {() => void | Promise<void>} [onClick]
 * @property {() => boolean | Promise<boolean>} [isVisible] — не используется оболочкой:
 *   пункт виден всем вошедшим. Сервер по-прежнему проверяет доступ при открытии.
 */

/**
 * Собирает приложения из зарегистрированных модулем расширений.
 * Пункты не фильтруются по праву модуля; кнопка в toolbar только при непустом списке.
 * Иначе при выключенном в ADP модуле панель пустеет и у администратора.
 * @returns {Promise<AppsMenuItem[]>}
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

export async function collectVisibleAppsMenuItems() {
  await whenSessionReady()
  if (!getAccess()) {
    return []
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
