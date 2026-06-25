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
   * Преобразует элемент меню в роут
   * @param {Object} item - элемент меню
   * @returns {Object|Array|null}
   */
  transformMenuItem(item) {
    // Пропускаем offcanvas элементы
    if (item.isOffcanvas) {
      return null
    }

    // Если это группа без маршрута (только children)
    if (!item.routeName && (item.children || item.list)) {
      return this.transformChildrenGroup(item)
    }

    // Получаем конфигурацию роута
    const routeConfig = this.routeManager.getRouteConfig(item.routeName || item.path)
    if (!routeConfig) {
      return null
    }

    const route = this.routeManager.createRoute(
      item.routeName || item.path,
      routeConfig,
      {
        title: item.name || item.title,
        meta: routeConfig.meta
      }
    )

    // Обрабатываем дочерние элементы
    const childRoutes = this.transformChildren(item)
    if (childRoutes.length > 0) {
      route.children = childRoutes
    }

    return route
  }

  /**
   * Преобразует группу дочерних элементов без родительского роута
   * @param {Object} item - элемент меню
   * @returns {Array}
   */
  transformChildrenGroup(item) {
    const childRoutes = []

    if (item.children && item.children.length > 0) {
      const transformedChildren = item.children
        .map(child => this.transformMenuItem(child))
        .filter(child => child !== null)
      childRoutes.push(...this.flattenRoutes(transformedChildren))
    }

    if (item.list && item.list.length > 0) {
      const transformedList = item.list
        .map(child => this.transformMenuItem(child))
        .filter(child => child !== null)
      childRoutes.push(...this.flattenRoutes(transformedList))
    }

    return childRoutes.length > 0 ? childRoutes : null
  }

  /**
   * Преобразует дочерние элементы
   * @param {Object} item - родительский элемент
   * @returns {Array}
   */
  transformChildren(item) {
    const childRoutes = []

    if (item.children && item.children.length > 0) {
      const transformedChildren = item.children
        .map(child => this.transformMenuItem(child))
        .filter(child => child !== null)
      childRoutes.push(...this.flattenRoutes(transformedChildren))
    }

    if (item.list && item.list.length > 0) {
      const transformedList = item.list
        .map(child => this.transformMenuItem(child))
        .filter(child => child !== null)
      childRoutes.push(...this.flattenRoutes(transformedList))
    }

    return childRoutes
  }

  /**
   * Разворачивает массивы роутов
   * @param {Array} routes - массив роутов
   * @returns {Array}
   */
  flattenRoutes(routes) {
    const result = []
    routes.forEach(route => {
      if (Array.isArray(route)) {
        result.push(...route)
      } else {
        result.push(route)
      }
    })
    return result
  }

  /**
   * Преобразует секцию меню в роут
   * @param {Object} section - секция меню
   * @returns {Object|null}
   */
  transformMenuSection(section) {
    const routeConfig = this.routeManager.getRouteConfig(section.routeName)
    if (!routeConfig) {
      return null
    }

    const route = this.routeManager.createRoute(
      section.routeName,
      routeConfig,
      {
        title: section.title,
        meta: routeConfig.meta
      }
    )

    // Обрабатываем дочерние элементы
    const childRoutes = this.transformChildren(section)
    if (childRoutes.length > 0) {
      route.children = childRoutes
    }

    return route
  }

  /**
   * Генерирует роуты из конфигурации меню
   * @returns {Array}
   */
  generateRoutesFromMenu() {
    const menuConfig = this.menuManager.generateMenuConfig()
    
    const routes = menuConfig.menuSections
      .map(section => this.transformMenuSection(section))
      .filter(route => route !== null)

    return routes
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

