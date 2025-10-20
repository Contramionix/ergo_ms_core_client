/**
 * МЕНЕДЖЕР БАЗОВЫХ РОУТОВ СИСТЕМЫ
 * 
 * Управляет core и auth роутами из конфигурации
 */

export class CoreRoutesManager {
  constructor(coreRoutesConfig) {
    this.coreRoutesConfig = coreRoutesConfig
    this.componentsMap = null
  }

  /**
   * Загружает маппинг компонентов
   */
  loadComponentsMap() {
    if (this.componentsMap) {
      return this.componentsMap
    }

    // Используем статические глобы
    const coreComponents = import.meta.glob('../../**/*.vue')
    const modulesComponents = import.meta.glob('../../../../../modules/**/client/**/*.vue')

    this.componentsMap = {
      ...coreComponents,
      ...modulesComponents
    }

    return this.componentsMap
  }

  /**
   * Получает функцию загрузки компонента
   * @param {string} componentPath - путь к компоненту
   * @returns {Function|null}
   */
  getComponentLoader(componentPath) {
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
      console.warn(`Компонент не найден: ${componentPath}`)
    }

    return loader || null
  }

  /**
   * Преобразует путь компонента в динамический импорт
   * @param {string} componentPath - путь к компоненту
   * @returns {Function}
   */
  transformComponentPath(componentPath) {
    const loader = this.getComponentLoader(componentPath)

    if (loader) {
      return loader
    }

    console.error(`Не удалось преобразовать путь: ${componentPath}`)
    return () => Promise.reject(new Error(`Component not found: ${componentPath}`))
  }

  /**
   * Преобразует роут из JSON формата в объект Vue Router
   * @param {Object} route - роут из конфигурации
   * @returns {Object}
   */
  transformRoute(route) {
    const transformedRoute = { ...route }

    if (route.component && typeof route.component === 'string') {
      transformedRoute.component = this.transformComponentPath(route.component)
    }

    return transformedRoute
  }

  /**
   * Загружает core роуты
   * @returns {Array}
   */
  loadCoreRoutes() {
    try {
      return this.coreRoutesConfig.coreRoutes.map(route => 
        this.transformRoute(route)
      )
    } catch (error) {
      console.error('Ошибка загрузки core роутов:', error)
      return []
    }
  }

  /**
   * Загружает auth роуты
   * @returns {Array}
   */
  loadAuthRoutes() {
    try {
      return this.coreRoutesConfig.authRoutes.map(route =>
        this.transformRoute(route)
      )
    } catch (error) {
      console.error('Ошибка загрузки auth роутов:', error)
      return []
    }
  }

  /**
   * Получает все базовые роуты (core + auth)
   * @returns {Array}
   */
  getAllCoreRoutes() {
    return [
      ...this.loadCoreRoutes(),
      ...this.loadAuthRoutes()
    ]
  }

  /**
   * Получает роут по имени
   * @param {string} routeName - имя роута
   * @returns {Object|undefined}
   */
  getCoreRouteByName(routeName) {
    const allRoutes = this.getAllCoreRoutes()
    return allRoutes.find(route => route.name === routeName)
  }

  /**
   * Получает все имена роутов
   * @returns {Array<string>}
   */
  getAllCoreRouteNames() {
    const allRoutes = this.getAllCoreRoutes()
    return allRoutes.map(route => route.name).filter(Boolean)
  }

  /**
   * Проверяет, является ли роут auth роутом
   * @param {string} routeName - имя роута
   * @returns {boolean}
   */
  isAuthRoute(routeName) {
    const authRoutes = this.loadAuthRoutes()
    return authRoutes.some(route => route.name === routeName)
  }
}

export default CoreRoutesManager

