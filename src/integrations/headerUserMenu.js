/**
 * Реестр расширений выпадающего меню пользователя в шапке (UserMenu).
 *
 * Модули регистрируют пункты через bridge.provideMany(HEADER_USER_MENU_ITEMS_GROUP, ...).
 * Ядро собирает их через collectVisibleHeaderUserMenuItems().
 */

import bridge from '@/integrations/ModuleBridge.js'
import { moduleManager } from '@/modules/index.js'

export const HEADER_USER_MENU_ITEMS_GROUP = 'header.userMenu.items'

/**
 * @typedef {Object} HeaderUserMenuItem
 * @property {string} id
 * @property {number} order
 * @property {string} title
 * @property {import('vue').Component} icon
 * @property {import('vue-router').RouteLocationRaw} link
 * @property {() => boolean | Promise<boolean>} [isVisible]
 */

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
      if (show) {
        visible.push(item)
      }
    } else {
      visible.push(item)
    }
  }

  return visible
}
