/**
 * ГЛАВНЫЙ МЕНЕДЖЕР МОДУЛЕЙ
 * 
 * Оркестрирует работу всех менеджеров модулей:
 * - RouteManager - управление роутами
 * - MenuManager - управление меню
 * - EndpointManager - управление API эндпоинтами
 * - IconManager - управление иконками
 * - SeparatorManager - управление сепараторами меню
 */

import { RouteManager } from './routes/RouteManager.js'
import { MenuManager } from './menu/MenuManager.js'
import { EndpointManager } from './api/EndpointManager.js'
import { IconManager } from './icons/IconManager.js'
import { SeparatorManager } from './menu/SeparatorManager.js'
import { RouteGenerator } from './routes/RouteGenerator.js'

export class ModuleManager {
  constructor(config = {}) {
    // Инициализируем менеджеры
    this.routeManager = new RouteManager()
    this.menuManager = new MenuManager(config.menuOrder)
    this.endpointManager = new EndpointManager()
    this.iconManager = new IconManager()
    this.separatorManager = new SeparatorManager()
    this.routeGenerator = null

    this.config = config
    this.initialized = false
  }

  /**
   * Инициализация всех менеджеров
   */
  async initialize() {
    if (this.initialized) {
      return
    }

    // Инициализируем менеджеры параллельно
    await Promise.all([
      this.routeManager.initialize(),
      this.menuManager.initialize(),
      this.endpointManager.initialize()
    ])

    // Создаем генератор роутов
    this.routeGenerator = new RouteGenerator(
      this.routeManager,
      this.menuManager
    )

    // Инициализируем сепараторы
    this.initializeSeparators()

    this.initialized = true
  }

  /**
   * Инициализирует менеджер сепараторов
   */
  initializeSeparators() {
    const menuConfig = this.menuManager.generateMenuConfig()
    
    const extendedConfig = {
      ...menuConfig,
      separators: {
        ...(menuConfig.separators || {}),
        byOrderIndex: this.config.menuOrder?.separators || {}
      },
      separatorSettings: {
        useOrderBased: true,
        useCategories: false
      }
    }

    this.separatorManager.updateConfig(extendedConfig)
  }

  /**
   * Получает все роуты для Vue Router
   * @param {Array} coreRoutes - базовые роуты системы
   * @returns {Array}
   */
  async generateAllRoutes(coreRoutes = []) {
    await this.ensureInitialized()
    return this.routeGenerator.generateAllRoutes(coreRoutes)
  }

  /**
   * Получает конфигурацию меню
   * @returns {Object}
   */
  async getMenuConfig() {
    await this.ensureInitialized()
    return this.menuManager.generateMenuConfig()
  }

  /**
   * Получает все эндпоинты
   * @returns {Object}
   */
  async getEndpoints() {
    await this.ensureInitialized()
    return this.endpointManager.getAllEndpoints()
  }

  /**
   * Получает иконку по имени
   * @param {string} iconName - имя иконки
   * @returns {Object|null}
   */
  getIcon(iconName) {
    return this.iconManager.getIcon(iconName)
  }

  /**
   * Получает сепаратор по индексу
   * @param {number} index - индекс элемента меню
   * @returns {string|null}
   */
  getSeparatorAt(index) {
    return this.separatorManager.getSeparatorAt(index)
  }

  /**
   * Проверяет, должен ли отображаться сепаратор
   * @param {number} index - индекс элемента меню
   * @returns {boolean}
   */
  shouldShowSeparator(index) {
    return this.separatorManager.shouldShowSeparator(index)
  }

  /**
   * Получает конфигурацию роута по имени
   * @param {string} routeName - имя роута
   * @returns {Object|null}
   */
  async getRouteConfig(routeName) {
    await this.ensureInitialized()
    return this.routeManager.getRouteConfig(routeName)
  }

  /**
   * Получает эндпоинт по имени
   * @param {string} endpointName - имя эндпоинта
   * @returns {string|null}
   */
  async getEndpoint(endpointName) {
    await this.ensureInitialized()
    return this.endpointManager.getEndpoint(endpointName)
  }

  /**
   * Валидирует всю конфигурацию модулей
   * @returns {Object}
   */
  async validateAll() {
    await this.ensureInitialized()

    const routeValidation = this.routeManager.validateAllRoutes()
    const menuValidation = this.menuManager.validateMenuConfig()
    const endpointValidation = this.endpointManager.validateEndpoints()

    return {
      isValid: routeValidation.isValid && menuValidation.isValid && endpointValidation.isValid,
      routes: routeValidation,
      menu: menuValidation,
      endpoints: endpointValidation
    }
  }

  /**
   * Получает статистику по всем модулям
   * @returns {Object}
   */
  async getStatistics() {
    await this.ensureInitialized()

    return {
      routes: this.routeManager.getStatistics(),
      menu: this.menuManager.getStatistics(),
      endpoints: this.endpointManager.getStatistics(),
      icons: this.iconManager.getStatistics(),
      separators: this.separatorManager.getStatistics()
    }
  }

  /**
   * Получает информацию о всех модулях
   * @returns {Array}
   */
  async getAllModules() {
    await this.ensureInitialized()
    return this.menuManager.getAllModules()
  }

  /**
   * Проверяет, включен ли модуль
   * @param {string} moduleName - имя модуля
   * @returns {boolean}
   */
  async isModuleEnabled(moduleName) {
    await this.ensureInitialized()
    return this.menuManager.isModuleEnabled(moduleName)
  }

  /**
   * Получает список включенных модулей
   * @returns {Array<string>}
   */
  async getEnabledModules() {
    await this.ensureInitialized()
    return this.menuManager.getEnabledModules()
  }

  /**
   * Очищает весь кеш
   */
  clearCache() {
    this.routeManager.clearCache()
    this.menuManager.clearCache()
    this.endpointManager.clearCache()
  }

  /**
   * Обеспечивает инициализацию
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  /**
   * Получает доступ к отдельным менеджерам
   */
  get routes() {
    return this.routeManager
  }

  get menu() {
    return this.menuManager
  }

  get endpoints() {
    return this.endpointManager
  }

  get icons() {
    return this.iconManager
  }

  get separators() {
    return this.separatorManager
  }
}

export default ModuleManager

