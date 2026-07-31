/**
 * Реестр пунктов меню приложений (AppsMenu в toolbar).
 *
 * Модули регистрируют приложения через bridge.provideMany(APPS_MENU_ITEMS_GROUP, ...).
 * Ядро собирает их через collectVisibleAppsMenuItems().
 */

import bridge from '@/integrations/ModuleBridge.js'
import { moduleManager } from '@/modules/index.js'

export const APPS_MENU_ITEMS_GROUP = 'apps.menu.items'

/**
 * @typedef {Object} AppsMenuItem
 * @property {string} id
 * @property {number} [order]
 * @property {string} title
 * @property {import('vue').Component} [icon]
 * @property {import('vue-router').RouteLocationRaw} route
 * @property {() => boolean | Promise<boolean>} [isVisible]
 */

/**
 * Собирает видимые приложения из зарегистрированных модулем расширений.
 * @returns {Promise<AppsMenuItem[]>}
 */
export async function collectVisibleAppsMenuItems() {
  if (!moduleManager.initialized) {
    await moduleManager.initialize()
  }

  const items = Object.values(bridge.all(APPS_MENU_ITEMS_GROUP)).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  )

  const visible = []

  for (const item of items) {
    if (!item?.id || !item?.route) {
      continue
    }
    if (typeof item.isVisible === 'function') {
      const show = await item.isVisible()
      if (!show) {
        continue
      }
    }
    visible.push({
      id: item.id,
      name: item.id,
      order: item.order ?? 0,
      title: typeof item.title === 'function' ? item.title() : item.title,
      icon: item.icon || null,
      route: item.route,
    })
  }

  return visible
}
