/**
 * МЕНЕДЖЕР УПРАВЛЕНИЯ ИКОНКАМИ
 *
 * Lucide подгружается отдельным chunk при первом обращении.
 */

import {
  getLucideIconAsync,
  getLucideIconSync,
  getLucideIconNames,
  getLoadedLucideIconMapping,
  normalizeLucideIconName,
  preloadLucideIcons,
  preloadLucideIconNames,
} from '@/js/lucideIconLoader.js'

export class IconManager {
  constructor() {
    this.customIcons = new Map()
  }

  preloadLucide() {
    return preloadLucideIcons()
  }

  preloadIconNames(iconNames) {
    return preloadLucideIconNames(iconNames)
  }

  getIcon(iconName) {
    const key = normalizeLucideIconName(iconName) || iconName
    if (this.customIcons.has(key)) {
      return this.customIcons.get(key)
    }
    return getLucideIconSync(key)
  }

  async getIconAsync(iconName) {
    const key = normalizeLucideIconName(iconName) || iconName
    if (this.customIcons.has(key)) {
      return this.customIcons.get(key)
    }
    return getLucideIconAsync(key)
  }

  registerCustomIcon(name, component) {
    const key = normalizeLucideIconName(name) || name
    this.customIcons.set(key, component)
  }

  registerCustomIcons(icons) {
    Object.entries(icons).forEach(([name, component]) => {
      this.registerCustomIcon(name, component)
    })
  }

  hasIcon(iconName) {
    const key = normalizeLucideIconName(iconName) || iconName
    return this.customIcons.has(key) || !!getLucideIconSync(key)
  }

  async getAllLucideIconNames() {
    return getLucideIconNames()
  }

  getAllCustomIconNames() {
    return Array.from(this.customIcons.keys())
  }

  removeCustomIcon(name) {
    return this.customIcons.delete(name)
  }

  clearCustomIcons() {
    this.customIcons.clear()
  }

  get iconMapping() {
    return getLoadedLucideIconMapping()
  }

  getStatistics() {
    const lucideCount = Object.keys(getLoadedLucideIconMapping()).length
    return {
      lucide: lucideCount,
      custom: this.customIcons.size,
      total: lucideCount + this.customIcons.size,
    }
  }
}

export default IconManager
