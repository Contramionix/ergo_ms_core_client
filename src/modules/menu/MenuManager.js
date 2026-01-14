/**
 * МЕНЕДЖЕР УПРАВЛЕНИЯ МЕНЮ МОДУЛЕЙ
 * 
 * Класс для загрузки, управления и генерации меню
 * из всех модулей системы (core и внешние)
 */

import { ModuleLoader } from '../core/ModuleLoader.js'

export class MenuManager extends ModuleLoader {
  constructor(orderConfig = null) {
    super()
    this.menuConfigs = new Map()
    this.orderConfig = orderConfig
    this.separatorsConfig = null
    this.initialized = false
  }

  /**
   * Инициализация менеджера меню
   */
  async initialize() {
    if (this.initialized) {
      return
    }

    await this.loadMenuConfigs()
    this.initialized = true
  }

  /**
   * Устанавливает конфигурацию порядка меню
   * @param {Object} orderConfig - конфигурация с menuOrder и separators
   */
  setOrderConfig(orderConfig) {
    this.orderConfig = orderConfig
    this.separatorsConfig = orderConfig?.separators || null
  }

  /**
   * Загружает все menu-config.json из модулей
   */
  async loadMenuConfigs() {
    // Если уже загружены, пропускаем
    if (this.menuConfigs.size > 0) {
      return
    }
    
    const configs = await this.loadAllModulesAsync('js/menu-config.json')

    Object.entries(configs).forEach(([path, config]) => {
      const moduleName = this.extractModuleNameFromPath(path)
      
      if (config && config.menuSections) {
        config.menuSections.forEach(section => {
          if (section.routeName) {
            this.menuConfigs.set(section.routeName, {
              ...section,
              _modulePath: path,
              _moduleName: moduleName
            })
          }
        })
      }
    })
  }

  /**
   * Извлекает имя модуля из пути
   * @param {string} path - путь к файлу
   * @returns {string}
   */
  extractModuleNameFromPath(path) {
    if (path.includes('/modules/')) {
      const match = path.match(/modules\/([^/]+)\/client/)
      return match ? `modules/${match[1]}` : 'unknown'
    } else {
      const match = path.match(/core\/([^/]+)/)
      return match ? `core/${match[1]}` : 'core'
    }
  }

  /**
   * Получает конфигурацию секции меню по имени роута
   * @param {string} routeName - имя роута
   * @returns {Object|null}
   */
  getMenuSection(routeName) {
    return this.menuConfigs.get(routeName) || null
  }

  /**
   * Фильтрует секции по родительскому роуту
   * @param {string} parentRouteName - имя родительского роута
   * @returns {Array}
   */
  filterByParent(parentRouteName) {
    const result = []
    
    this.menuConfigs.forEach((section) => {
      if (section.parentRoute === parentRouteName) {
        result.push(section)
      }
    })

    return result
  }

  /**
   * Интегрирует дочерние секции в родительские
   * @param {Array} sections - массив секций
   * @returns {Array}
   */
  integrateChildren(sections) {
    sections.forEach(section => {
      const children = this.filterByParent(section.routeName)

      if (children.length > 0) {
        if (!section.children) {
          section.children = []
        }

        children.forEach(child => {
          const alreadyAdded = section.children.some(
            existing => existing.routeName === child.routeName
          )

          if (!alreadyAdded) {
            section.children.push(child)
          }
        })
      }
    })

    return sections
  }

  /**
   * Сортирует секции по заданному порядку
   * @param {Array} sections - массив секций
   * @param {Array} order - массив с порядком роутов
   * @returns {Array}
   */
  sortSectionsByOrder(sections, order) {
    if (!order || order.length === 0) {
      return sections
    }

    const sectionMap = new Map()
    sections.forEach(section => {
      if (section.routeName) {
        sectionMap.set(section.routeName, section)
      }
    })

    const sortedSections = []
    
    order.forEach(routeName => {
      if (sectionMap.has(routeName)) {
        sortedSections.push(sectionMap.get(routeName))
        sectionMap.delete(routeName)
      }
    })

    sectionMap.forEach(section => {
      sortedSections.push(section)
    })

    return sortedSections
  }

  /**
   * Генерирует финальную конфигурацию меню
   * @returns {Object}
   */
  generateMenuConfig() {
    const menuOrder = this.orderConfig?.menuOrder || []
    const sections = []
    const processedSections = new Set()

    menuOrder.forEach(routeName => {
      const section = this.menuConfigs.get(routeName)

      if (section && !section.parentRoute && !processedSections.has(routeName)) {
        sections.push({ ...section })
        processedSections.add(routeName)
      }
    })

    const sectionsWithChildren = this.integrateChildren(sections)

    return {
      menuSections: sectionsWithChildren,
      separators: this.separatorsConfig
    }
  }

  /**
   * Получает все доступные модули
   * @returns {Array}
   */
  getAllModules() {
    const menuOrder = this.orderConfig?.menuOrder || []
    const modules = []

    this.menuConfigs.forEach((section, routeName) => {
      modules.push({
        name: routeName,
        enabled: menuOrder.includes(routeName),
        modulePath: section._moduleName
      })
    })

    return modules
  }

  /**
   * Получает включенные модули
   * @returns {Array<string>}
   */
  getEnabledModules() {
    return this.orderConfig?.menuOrder || []
  }

  /**
   * Проверяет, включен ли модуль
   * @param {string} moduleName - имя модуля
   * @returns {boolean}
   */
  isModuleEnabled(moduleName) {
    const menuOrder = this.orderConfig?.menuOrder || []
    return menuOrder.includes(moduleName)
  }

  /**
   * Валидирует конфигурацию меню
   * @returns {Object}
   */
  validateMenuConfig() {
    const errors = []
    const warnings = []

    // Проверяем только загруженные конфигурации (если они есть)
    this.menuConfigs.forEach((section, routeName) => {
      if (!section.title && !section.name) {
        warnings.push(`Секция "${routeName}" не содержит title или name`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Получает статистику по меню
   * @returns {Object}
   */
  getStatistics() {
    const coreSections = []
    const moduleSections = []

    this.menuConfigs.forEach((section, name) => {
      if (section._modulePath.includes('/core/')) {
        coreSections.push(name)
      } else {
        moduleSections.push(name)
      }
    })

    return {
      total: this.menuConfigs.size,
      core: coreSections.length,
      modules: moduleSections.length,
      enabled: this.getEnabledModules().length
    }
  }
}

export default MenuManager

