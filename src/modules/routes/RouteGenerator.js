/**
 * ГЕНЕРАТОР РОУТОВ
 *
 * Класс для генерации роутов Vue Router из routes.js файлов модулей
 */

import { logError } from '@/js/utils/logError.js'

export class RouteGenerator {
  constructor(routeManager) {
    this.routeManager = routeManager
  }

  /**
   * Получает имена уже созданных роутов
   * @param {Array} routes - массив роутов
   * @returns {Set}
   */
  getCreatedRouteNames(routes) {
    const names = new Set()

    const extractNames = (routeArray) => {
      routeArray.forEach(route => {
        if (route.name) names.add(route.name)
        if (route.children) extractNames(route.children)
      })
    }

    extractNames(routes)
    return names
  }

  /**
   * Генерирует недостающие роуты
   * @param {Set} createdRouteNames - уже созданные имена роутов
   * @returns {Array}
   */
  generateMissingRoutes(createdRouteNames) {
    const missingRoutes = []
    const allRoutes = this.routeManager.getAllRoutes()

    Object.entries(allRoutes).forEach(([routeName, routeConfig]) => {
      if (!createdRouteNames.has(routeName)) {
        try {
          const route = this.routeManager.createRoute(routeName, routeConfig)
          missingRoutes.push(route)
        } catch (error) {
          logError(`Не удалось создать роут ${routeName}`, error)
        }
      }
    })

    return missingRoutes
  }

  /**
   * Генерирует все роуты из routes.js файлов модулей.
   * Catch-all (NotFound) переносится в конец, иначе перехватывает все пути до модульных роутов.
   * @param {Array} coreRoutes - базовые роуты системы
   * @returns {Array}
   */
  generateAllRoutes(coreRoutes = []) {
    const createdRouteNames = this.getCreatedRouteNames(coreRoutes)
    const missingRoutes = this.generateMissingRoutes(createdRouteNames)

    const catchAllPaths = [':pathMatch(.*)', ':pathMatch(.*)*', ':pathMatch(.*)*?']
    const isCatchAll = (r) => r.path && catchAllPaths.some(p => r.path.includes(p))
    const catchAllRoutes = (coreRoutes || []).filter(isCatchAll)
    const coreRest = (coreRoutes || []).filter(r => !isCatchAll(r))

    return [
      ...coreRest,
      ...missingRoutes,
      ...catchAllRoutes
    ]
  }

  /**
   * Валидирует сгенерированные роуты
   * @param {Array} routes - массив роутов
   * @returns {Object}
   */
  validateGeneratedRoutes(routes) {
    const errors = []
    const warnings = []

    routes.forEach(route => {
      if (!route.path) {
        errors.push(`Роут "${route.name}" не содержит path`)
      }

      if (!route.component) {
        errors.push(`Роут "${route.name}" не содержит component`)
      }

      if (route.children) {
        const childValidation = this.validateGeneratedRoutes(route.children)
        errors.push(...childValidation.errors)
        warnings.push(...childValidation.warnings)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

export default RouteGenerator
