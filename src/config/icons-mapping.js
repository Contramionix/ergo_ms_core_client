/**
 * Публичный фасад иконок меню: имена Lucide (PascalCase) → IconManager.
 * Рендер в UI — через LucideIcon; здесь только resolve/preload для данных меню.
 */

import { getIcon, moduleManager } from '@/modules/index.js'
import { getLoadedLucideIconMapping, normalizeLucideIconName } from '@/js/lucideIconLoader.js'

export const iconMapping = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined
      }
      return getIcon(normalizeLucideIconName(prop) || prop)
    },
    has(_target, prop) {
      if (typeof prop !== 'string') {
        return false
      }
      return Boolean(getIcon(normalizeLucideIconName(prop) || prop))
    },
    ownKeys() {
      return Object.keys(getLoadedLucideIconMapping())
    },
    getOwnPropertyDescriptor(_target, prop) {
      const key = typeof prop === 'string' ? normalizeLucideIconName(prop) || prop : prop
      const icon = typeof key === 'string' ? getIcon(key) : null
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

export { getIcon, normalizeLucideIconName }

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
    const name = normalizeLucideIconName(item?.icon)
    if (name) {
      bucket.push(name)
    }
    if (item?.children?.length) {
      collectMenuIconNames({ menu_items: item.children }, bucket)
    }
  }
  return bucket
}
