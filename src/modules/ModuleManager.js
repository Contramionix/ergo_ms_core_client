/**
 * ГЛАВНЫЙ МЕНЕДЖЕР МОДУЛЕЙ
 *
 * Оркестрирует работу всех менеджеров модулей:
 * - RouteManager - управление роутами
 * - EndpointManager - управление API эндпоинтами
 * - IconManager - управление иконками
 * - PermissionRulesManager - управление правилами проверки прав
 */

import { RouteManager } from './routes/RouteManager.js'
import { EndpointManager } from './api/EndpointManager.js'
import { IconManager } from './icons/IconManager.js'
import { RouteGenerator } from './routes/RouteGenerator.js'
import { PermissionRulesManager } from './permissions/PermissionRulesManager.js'
import { PermissionSectionsManager } from './permissions/PermissionSectionsManager.js'
import { IntegrationsManager } from './integrations/IntegrationsManager.js'

export class ModuleManager {
  constructor() {
    this.routeManager = new RouteManager()
    this.endpointManager = new EndpointManager()
    this.iconManager = new IconManager()
    this.permissionRulesManager = new PermissionRulesManager()
    this.permissionSectionsManager = new PermissionSectionsManager()
    this.integrationsManager = new IntegrationsManager()
    this.routeGenerator = null

    this.initialized = false
    this._initPromise = null
  }

  /**
   * Инициализация всех менеджеров
   */
  async initialize() {
    if (this.initialized) {
      return
    }

    await Promise.all([
      this.routeManager.initialize(),
      this.endpointManager.initialize(),
      this.permissionRulesManager.initialize(),
      this.permissionSectionsManager.initialize()
    ])

    this.routeGenerator = new RouteGenerator(this.routeManager)

    // Интеграции не блокируют старт приложения: файлы регистрируют bridge
    // синхронно при загрузке chunk; await нужен только для статистики/отладки.
    void this.integrationsManager.initialize()

    this.initialized = true
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
   * Получает все эндпоинты
   * @returns {Object}
   */
  async getEndpoints() {
    await this.ensureInitialized()
    return this.endpointManager.getAllEndpoints()
  }

  /**
   * Получает все правила проверки прав
   * @returns {Array}
   */
  async getPermissionRules() {
    await this.ensureInitialized()
    return this.permissionRulesManager.getAllRules()
  }

  /**
   * Получает все секции прав модулей
   * @returns {Array}
   */
  async getPermissionSections() {
    await this.ensureInitialized()
    return this.permissionSectionsManager.getAllSections()
  }

  /**
   * Формирует начальное состояние прав из всех секций
   * @param {Array} [sections] - секции (по умолчанию все обнаруженные)
   * @returns {Object}
   */
  async buildInitialPermissionState(sections) {
    await this.ensureInitialized()
    return this.permissionSectionsManager.buildInitialPermissionState(sections)
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
    const endpointValidation = this.endpointManager.validateEndpoints()
    const permissionRulesValidation = this.permissionRulesManager.validateAllRules()

    return {
      isValid: routeValidation.isValid && endpointValidation.isValid && permissionRulesValidation.isValid,
      routes: routeValidation,
      endpoints: endpointValidation,
      permissionRules: permissionRulesValidation
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
      endpoints: this.endpointManager.getStatistics(),
      icons: this.iconManager.getStatistics(),
      permissionRules: this.permissionRulesManager.getStatistics(),
      permissionSections: this.permissionSectionsManager.getStatistics(),
      integrations: this.integrationsManager.getStatistics()
    }
  }

  /**
   * Очищает весь кеш
   */
  clearCache() {
    this.routeManager.clearCache()
    this.endpointManager.clearCache()
    this.permissionRulesManager.clearCache()
    this.permissionSectionsManager.clearCache()
    this.integrationsManager.clearCache()
    this.initialized = false
    this._initPromise = null
  }

  /**
   * Обеспечивает инициализацию
   */
  async ensureInitialized() {
    if (this.initialized) {
      return
    }
    if (!this._initPromise) {
      this._initPromise = this.initialize()
    }
    await this._initPromise
  }

  /**
   * Подгружает список disabled-модулей с API (silent, не блокирует запуск при ошибке).
   * Вызывать после успешной аутентификации для синхронизации с сервером.
   * @param {Object} apiClient - инстанс axios/api manager
   */
  async refreshDisabledModules(apiClient) {
    try {
      const { fetchDisabledModules } = await import('./core/disabledModules.js')
      if (apiClient) {
        await fetchDisabledModules(apiClient)
      }
    } catch {
      // Если API недоступен — используется значение из VITE_DISABLED_MODULES
    }
  }

  get routes() {
    return this.routeManager
  }

  get endpoints() {
    return this.endpointManager
  }

  get icons() {
    return this.iconManager
  }

  get permissionRules() {
    return this.permissionRulesManager
  }

  get permissionSections() {
    return this.permissionSectionsManager
  }

  get integrations() {
    return this.integrationsManager
  }
}

export default ModuleManager
