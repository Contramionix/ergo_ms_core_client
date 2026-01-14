/**
 * МЕНЕДЖЕР ПРАВИЛ ПРОВЕРКИ ПРАВ МОДУЛЕЙ
 * 
 * Класс для загрузки и управления правилами проверки прав
 * для маршрутов из всех модулей системы (core и внешние).
 * 
 * Каждый модуль может определять свои правила в файле permission-rules.js
 */

import { ModuleLoader } from '../core/ModuleLoader.js'

export class PermissionRulesManager extends ModuleLoader {
  constructor() {
    super()
    this.rules = []
    this.initialized = false
  }

  /**
   * Инициализация менеджера правил
   */
  async initialize() {
    if (this.initialized) {
      return
    }

    this.loadPermissionRules()
    this.initialized = true
  }

  /**
   * Загружает все permission-rules.js из модулей
   */
  loadPermissionRules() {
    const rulesModules = this.loadAllModules('js/permission-rules.js', true)

    Object.entries(rulesModules).forEach(([path, module]) => {
      // Получаем default экспорт или первый экспорт
      const moduleRules = module.default || Object.values(module)[0]

      if (Array.isArray(moduleRules)) {
        moduleRules.forEach((rule) => {
          if (this.validateRule(rule)) {
            this.rules.push({
              ...rule,
              _modulePath: path
            })
          } else {
            console.warn(`[PermissionRulesManager] Невалидное правило в ${path}:`, rule)
          }
        })
      } else {
        console.warn(`[PermissionRulesManager] Модуль ${path} не экспортирует массив правил`)
      }
    })
  }

  /**
   * Валидирует структуру правила
   * @param {Object} rule - правило для валидации
   * @returns {boolean}
   */
  validateRule(rule) {
    if (!rule || typeof rule !== 'object') {
      return false
    }

    // Проверяем обязательные поля
    if (typeof rule.match !== 'function') {
      return false
    }

    if (typeof rule.module !== 'string' || !rule.module) {
      return false
    }

    if (!Array.isArray(rule.permissions) || rule.permissions.length === 0) {
      return false
    }

    return true
  }

  /**
   * Получает все правила
   * @returns {Array}
   */
  getAllRules() {
    return [...this.rules]
  }

  /**
   * Получает правила для конкретного модуля
   * @param {string} moduleName - имя модуля
   * @returns {Array}
   */
  getRulesByModule(moduleName) {
    return this.rules.filter((rule) => rule.module === moduleName)
  }

  /**
   * Находит правило, соответствующее маршруту
   * @param {Object} to - объект маршрута Vue Router
   * @returns {Object|null}
   */
  findMatchingRule(to) {
    return this.rules.find((rule) => {
      try {
        return rule.match(to)
      } catch (error) {
        console.error(`Ошибка при проверке правила:`, error)
        return false
      }
    }) || null
  }

  /**
   * Находит все правила, соответствующие маршруту
   * @param {Object} to - объект маршрута Vue Router
   * @returns {Array}
   */
  findAllMatchingRules(to) {
    return this.rules.filter((rule) => {
      try {
        return rule.match(to)
      } catch (error) {
        console.error(`Ошибка при проверке правила:`, error)
        return false
      }
    })
  }

  /**
   * Получает статистику по правилам
   * @returns {Object}
   */
  getStatistics() {
    const moduleStats = {}

    this.rules.forEach((rule) => {
      if (!moduleStats[rule.module]) {
        moduleStats[rule.module] = 0
      }
      moduleStats[rule.module]++
    })

    return {
      total: this.rules.length,
      byModule: moduleStats
    }
  }

  /**
   * Валидирует все правила
   * @returns {Object}
   */
  validateAllRules() {
    const errors = []
    const warnings = []

    this.rules.forEach((rule, index) => {
      // Проверяем наличие title и message
      if (!rule.title) {
        warnings.push(`Правило #${index} (${rule.module}): отсутствует title`)
      }

      if (!rule.message) {
        warnings.push(`Правило #${index} (${rule.module}): отсутствует message`)
      }

      // Проверяем permissions
      rule.permissions.forEach((perm) => {
        if (typeof perm !== 'string') {
          errors.push(`Правило #${index} (${rule.module}): permission должен быть строкой`)
        }
      })
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Очищает кеш и сбрасывает состояние
   */
  clearCache() {
    super.clearCache()
    this.rules = []
    this.initialized = false
  }
}

export default PermissionRulesManager
