/**
 * Реестр расширений выпадающего меню пользователя в шапке (UserMenu).
 *
 * Модули регистрируют пункты через bridge.provideMany(HEADER_USER_MENU_ITEMS_GROUP, ...).
 * Ядро собирает их через collectVisibleHeaderUserMenuItems().
 *
 * Иконка пункта и trailingAction — строка Lucide PascalCase; рендер через LucideIcon.
 */

import bridge from '@/integrations/ModuleBridge.js'
import { moduleManager } from '@/modules/index.js'
import { normalizeLucideIconName } from '@/js/lucideIconLoader.js'

export const HEADER_USER_MENU_ITEMS_GROUP = 'header.userMenu.items'

/**
 * @typedef {Object} HeaderUserMenuTrailingAction
 * @property {string} icon — Lucide PascalCase
 * @property {string} title — aria-label / tooltip
 * @property {() => void | Promise<void>} onClick
 */

/**
 * @typedef {Object} HeaderUserMenuItem
 * @property {string} id
 * @property {number} order
 * @property {string} title
 * @property {string} icon — Lucide PascalCase
 * @property {import('vue-router').RouteLocationRaw} link
 * @property {() => boolean | Promise<boolean>} [isVisible]
 * @property {HeaderUserMenuTrailingAction} [trailingAction]
 */

function normalizeTrailingAction(action) {
  if (!action || typeof action.onClick !== 'function') {
    return undefined
  }
  return {
    icon: normalizeLucideIconName(action.icon),
    title: action.title,
    onClick: action.onClick,
  }
}

/**
 * Собирает видимые пункты меню из зарегистрированных модулем расширений.
 * @returns {Promise<HeaderUserMenuItem[]>}
 */
export async function collectVisibleHeaderUserMenuItems() {
  if (!moduleManager.initialized) {
    await moduleManager.initialize()
  }

  const items = Object.values(bridge.all(HEADER_USER_MENU_ITEMS_GROUP))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const visible = []

  for (const item of items) {
    if (typeof item.isVisible === 'function') {
      const show = await item.isVisible()
      if (!show) {
        continue
      }
    }
    visible.push({
      ...item,
      icon: normalizeLucideIconName(item.icon),
      trailingAction: normalizeTrailingAction(item.trailingAction),
    })
  }

  return visible
}
