/**
 * МАППИНГ ИКОНОК ДЛЯ КОНФИГУРАЦИОННОГО МЕНЮ
 *
 * Управление иконками через модульную систему (IconManager).
 * Lucide подгружается лениво — в mapping попадают только уже загруженные иконки.
 */

import { getIcon, moduleManager } from '@/modules/index.js'
import { getLoadedLucideIconMapping } from '@/js/lucideIconLoader.js'

export const iconMapping = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined
      }
      return getIcon(prop)
    },
    has(_target, prop) {
      if (typeof prop !== 'string') {
        return false
      }
      return Boolean(getIcon(prop))
    },
    ownKeys() {
      return Object.keys(getLoadedLucideIconMapping())
    },
    getOwnPropertyDescriptor(_target, prop) {
      const icon = getIcon(prop)
      if (!icon) {
        return undefined
      }
      return {
        configurable: true,
        enumerable: true,
        value: icon,
      }
    },
  },
)

export { getIcon }

export function preloadMenuIconsFromData(menuData) {
  const iconNames = collectMenuIconNames(menuData)
  if (iconNames.length === 0) {
    return Promise.resolve()
  }
  return moduleManager.icons.preloadIconNames(iconNames)
}

function collectMenuIconNames(menuData, bucket = []) {
  const items = menuData?.menu_items || menuData || []
  for (const item of items) {
    if (item?.icon) {
      bucket.push(item.icon)
    }
    if (item?.children?.length) {
      collectMenuIconNames({ menu_items: item.children }, bucket)
    }
  }
  return bucket
}
