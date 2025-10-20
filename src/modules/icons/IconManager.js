/**
 * МЕНЕДЖЕР УПРАВЛЕНИЯ ИКОНКАМИ
 * 
 * Класс для управления иконками из библиотеки lucide-vue-next
 */

import * as LucideIcons from 'lucide-vue-next'

export class IconManager {
  constructor() {
    this.iconMapping = LucideIcons
    this.customIcons = new Map()
  }

  /**
   * Получает компонент иконки по имени
   * @param {string} iconName - имя иконки
   * @returns {Object|null}
   */
  getIcon(iconName) {
    // Сначала проверяем кастомные иконки
    if (this.customIcons.has(iconName)) {
      return this.customIcons.get(iconName)
    }

    // Затем проверяем lucide иконки
    return this.iconMapping[iconName] || null
  }

  /**
   * Регистрирует кастомную иконку
   * @param {string} name - имя иконки
   * @param {Object} component - Vue компонент иконки
   */
  registerCustomIcon(name, component) {
    this.customIcons.set(name, component)
  }

  /**
   * Регистрирует несколько кастомных иконок
   * @param {Object} icons - объект с именами и компонентами
   */
  registerCustomIcons(icons) {
    Object.entries(icons).forEach(([name, component]) => {
      this.registerCustomIcon(name, component)
    })
  }

  /**
   * Проверяет существование иконки
   * @param {string} iconName - имя иконки
   * @returns {boolean}
   */
  hasIcon(iconName) {
    return this.customIcons.has(iconName) || !!this.iconMapping[iconName]
  }

  /**
   * Получает список всех доступных иконок Lucide
   * @returns {Array<string>}
   */
  getAllLucideIconNames() {
    return Object.keys(this.iconMapping)
  }

  /**
   * Получает список всех кастомных иконок
   * @returns {Array<string>}
   */
  getAllCustomIconNames() {
    return Array.from(this.customIcons.keys())
  }

  /**
   * Удаляет кастомную иконку
   * @param {string} name - имя иконки
   * @returns {boolean}
   */
  removeCustomIcon(name) {
    return this.customIcons.delete(name)
  }

  /**
   * Очищает все кастомные иконки
   */
  clearCustomIcons() {
    this.customIcons.clear()
  }

  /**
   * Получает статистику
   * @returns {Object}
   */
  getStatistics() {
    return {
      lucide: this.getAllLucideIconNames().length,
      custom: this.customIcons.size,
      total: this.getAllLucideIconNames().length + this.customIcons.size
    }
  }
}

export default IconManager

