/**
 * МЕНЕДЖЕР УПРАВЛЕНИЯ РОУТАМИ МОДУЛЕЙ
 * 
 * Класс для загрузки, управления и генерации маршрутов
 * из всех модулей системы (core и внешние)
 */

import { ModuleLoader } from '../core/ModuleLoader.js'

export class RouteManager extends ModuleLoader {
  constructor() {
    super()
    this.routes = new Map()
    this.componentsMap = null
    this.initialized = false
  }

  /**
   * Инициализация менеджера роутов
   */
  async initialize() {
    if (this.initialized) {
      return
    }

    await this.loadRoutes()
    this.loadComponentsMap()
    this.initialized = true
  }

  /**
   * Загружает все routes.js из модулей
   */
  async loadRoutes() {
    const routesModules = this.loadAllModules('js/routes.js', true)

    Object.entries(routesModules).forEach(([path, module]) => {
      const routes = module.default || module
      
      if (routes && typeof routes === 'object') {
        Object.entries(routes).forEach(([routeName, routeConfig]) => {
          if (!this.routes.has(routeName)) {
            this.routes.set(routeName, {
              ...routeConfig,
              _modulePath: path
            })
          }
        })
      }
    })
  }

  /**
   * Загружает маппинг всех Vue компонентов
   */
  loadComponentsMap() {
    if (this.componentsMap) {
      return this.componentsMap
    }

    // Используем предзагруженные глобы из родительского класса
    this.componentsMap = this.getGlobsByType('components', 'all')

    return this.componentsMap
  }

  /**
   * Получает функцию загрузки компонента по пути
   * @param {string} componentPath - путь к компоненту с алиасом
   * @returns {Function|null}
   */
  getComponentLoader(componentPath) {
    if (!componentPath || typeof componentPath !== 'string') {
      return null
    }

    if (!this.componentsMap) {
      this.loadComponentsMap()
    }

    let searchPath

    if (componentPath.startsWith('@/modules/')) {
      searchPath = componentPath.replace('@/modules/', '../../../../../modules/')
    } else if (componentPath.startsWith('@/')) {
      searchPath = componentPath.replace('@/', '../../')
    } else {
      return null
    }

    const loader = this.componentsMap[searchPath]

    if (!loader) {
      console.warn(`Компонент не найден: ${componentPath} (искали: ${searchPath})`)
    }

    return loader || null
  }

  /**
   * Создает lazy import для компонента
   * @param {string} componentPath - путь к компоненту
   * @returns {Function}
   */
  createLazyImport(componentPath) {
    const loader = this.getComponentLoader(componentPath)

    if (loader) {
      return loader
    }

    console.error(`Не удалось создать lazy import для: ${componentPath}`)
    return () => Promise.reject(new Error(`Component not found: ${componentPath}`))
  }

  /**
   * Получает конфигурацию роута по имени
   * @param {string} routeName - имя роута
   * @returns {Object|null}
   */
  getRouteConfig(routeName) {
    return this.routes.get(routeName) || null
  }

  /**
   * Получает все роуты
   * @returns {Object}
   */
  getAllRoutes() {
    const result = {}
    this.routes.forEach((config, name) => {
      result[name] = config
    })
    return result
  }

  /**
   * Проверяет существование роута
   * @param {string} routeName - имя роута
   * @returns {boolean}
   */
  hasRoute(routeName) {
    return this.routes.has(routeName)
  }

  /**
   * Преобразует конфигурацию роута в объект Vue Router
   * @param {string} routeName - имя роута
   * @param {Object} routeConfig - конфигурация роута
   * @param {Object} options - дополнительные опции (title, meta)
   * @returns {Object}
   */
  createRoute(routeName, routeConfig, options = {}) {
    const route = {
      path: routeConfig.path,
      name: routeName,
      meta: {
        title: options.title || routeConfig.meta?.title,
        ...routeConfig.meta,
        ...options.meta
      }
    }

    // Устанавливаем компонент только если он указан
    if (routeConfig.component) {
      route.component = this.createLazyImport(routeConfig.component)
    }

    // Обрабатываем redirect (если есть redirect, компонент не обязателен)
    if (routeConfig.redirect) {
      if (typeof routeConfig.redirect === 'string' && routeConfig.redirect.startsWith('/')) {
        route.redirect = routeConfig.redirect
      } else if (typeof routeConfig.redirect === 'string') {
        route.redirect = { name: routeConfig.redirect }
      } else {
        route.redirect = routeConfig.redirect
      }
    }

    return route
  }

  /**
   * Получает имена всех роутов
   * @returns {Array<string>}
   */
  getAllRouteNames() {
    return Array.from(this.routes.keys())
  }

  /**
   * Фильтрует роуты по условию
   * @param {Function} predicate - функция-предикат
   * @returns {Array}
   */
  filterRoutes(predicate) {
    const result = []
    this.routes.forEach((config, name) => {
      if (predicate(name, config)) {
        result.push({ name, config })
      }
    })
    return result
  }

  /**
   * Валидирует конфигурацию роута
   * @param {string} routeName - имя роута
   * @param {Object} routeConfig - конфигурация роута
   * @returns {Object} - результат валидации
   */
  validateRoute(routeName, routeConfig) {
    const errors = []
    const warnings = []

    if (!routeConfig.path) {
      errors.push(`Роут "${routeName}" не содержит path`)
    }

    // Компонент обязателен только если нет redirect
    if (!routeConfig.component && !routeConfig.redirect) {
      errors.push(`Роут "${routeName}" не содержит component и не имеет redirect`)
    } else if (routeConfig.component) {
      const loader = this.getComponentLoader(routeConfig.component)
      if (!loader) {
        errors.push(`Компонент "${routeConfig.component}" для роута "${routeName}" не найден`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Валидирует все роуты
   * @returns {Object} - результат валидации
   */
  validateAllRoutes() {
    const errors = []
    const warnings = []

    this.routes.forEach((config, name) => {
      const validation = this.validateRoute(name, config)
      errors.push(...validation.errors)
      warnings.push(...validation.warnings)
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Получает статистику по роутам
   * @returns {Object}
   */
  getStatistics() {
    const coreRoutes = []
    const moduleRoutes = []

    this.routes.forEach((config, name) => {
      if (config._modulePath.includes('/core/')) {
        coreRoutes.push(name)
      } else {
        moduleRoutes.push(name)
      }
    })

    return {
      total: this.routes.size,
      core: coreRoutes.length,
      modules: moduleRoutes.length,
      coreRoutes,
      moduleRoutes
    }
  }
}

export default RouteManager

