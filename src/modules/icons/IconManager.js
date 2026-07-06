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
    if (this.customIcons.has(iconName)) {
      return this.customIcons.get(iconName)
    }
    return getLucideIconSync(iconName)
  }

  async getIconAsync(iconName) {
    if (this.customIcons.has(iconName)) {
      return this.customIcons.get(iconName)
    }
    return getLucideIconAsync(iconName)
  }

  registerCustomIcon(name, component) {
    this.customIcons.set(name, component)
  }

  registerCustomIcons(icons) {
    Object.entries(icons).forEach(([name, component]) => {
      this.registerCustomIcon(name, component)
    })
  }

  hasIcon(iconName) {
    return this.customIcons.has(iconName) || !!getLucideIconSync(iconName)
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
