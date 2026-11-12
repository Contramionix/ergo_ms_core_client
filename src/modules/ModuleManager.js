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
import { RouteGuardsManager } from './routing/RouteGuardsManager.js'
import { IntegrationsManager } from './integrations/IntegrationsManager.js'
import { fetchDisabledModules } from './core/disabledModules.js'
import { registerClientModule } from './core/registerClientModule.js'
import { parseModuleRemotes } from './core/parseModuleRemotes.js'
import { ensureSharedGlobs } from './core/ModuleLoader.js'
import { clientEnv } from '@/js/clientEnv.js'
import { authRoutes, coreRoutes } from '@/config/routes.js'
import { getLocaleManager } from './i18n/LocaleManager.js'
import { getThemeDefaultsManager } from './themes/ThemeDefaultsManager.js'
import { logError } from '@/js/utils/logError.js'
import bridge from '@/integrations/ModuleBridge.js'
import { routeMapCoversPath, routesCoverPath } from './routes/vueRoutePath.js'

// Имя контракта строкой: константа из moduleContracts.js лежит в другом чанке,
// и к моменту new ModuleManager() тот чанк ещё не успевает её присвоить.
const LOAD_REMOTES_UNTIL_GROUP = 'shell.load_remotes_until_group'

function getConfiguredModuleRemotes() {
  return parseModuleRemotes(clientEnv.moduleRemotes || '')
}

async function loadFederatedModules(onlyNames) {
  const mod = await import('./core/federatedModules.js')
  return mod.loadFederatedModules(onlyNames)
}

export class ModuleManager {
  constructor() {
    this.routeManager = new RouteManager()
    this.endpointManager = new EndpointManager()
    this.iconManager = new IconManager()
    this.permissionRulesManager = new PermissionRulesManager()
    this.permissionSectionsManager = new PermissionSectionsManager()
    this.routeGuardsManager = new RouteGuardsManager()
    this.integrationsManager = new IntegrationsManager()
    this.routeGenerator = null
    /** @type {import('./core/clientModuleManifest.js').ClientModuleManifest[]} */
    this.registeredManifests = []

    this.initialized = false
    this.coreReady = false
    this._initPromise = null
    this._coreReadyPromise = null
    this._resolveCoreReady = null
    /** @type {Set<string>} */
    this._loadedRemoteKeys = new Set()
    this._remoteChain = Promise.resolve()
    bridge.provide(
      LOAD_REMOTES_UNTIL_GROUP,
      (group) => this.loadRemotesUntilGroup(group),
      { override: true },
    )
  }

  /**
   * Инициализация всех менеджеров.
   * Совпадает с ensureInitialized: прямой вызов из меню/виджетов не должен
   * запускать вторую загрузку remotes, пока первая ещё не выставила initialized.
   */
  async initialize() {
    await this.ensureInitialized()
  }

  /**
   * @returns {Promise<void>}
   */
  _markCoreReady() {
    if (this.coreReady) {
      return
    }
    this.coreReady = true
    this._resolveCoreReady?.()
  }

  _startInitialize() {
    if (this._initPromise) {
      return
    }
    this._coreReadyPromise = new Promise((resolve) => {
      this._resolveCoreReady = resolve
    })
    this._initPromise = this._doInitialize().catch((error) => {
      this._initPromise = null
      if (!this.coreReady) {
        this._coreReadyPromise = null
        this._resolveCoreReady = null
      }
      throw error
    })
  }

  async _doInitialize() {
    await ensureSharedGlobs()
    await Promise.all([
      this.routeManager.initialize(),
      this.endpointManager.initialize(),
      this.permissionRulesManager.initialize(),
      this.routeGuardsManager.initialize(),
      this.integrationsManager.initialize(),
    ])

    this.routeGenerator = new RouteGenerator(this.routeManager)
    this._markCoreReady()

    // Страница ядра (совет, кабинет) не тянет все remoteEntry: на HTTP/1.1
    // шесть соединений на весь сайт, и каждая вкладка иначе занимает их модулями.
    // Глубокая ссылка на remote грузит модули по одному, пока маршрут не совпадёт.
    const landingPath = typeof window !== 'undefined' ? (window.location.pathname || '') : ''
    if (
      landingPath
      && (clientEnv.modularity === 'federated' || getConfiguredModuleRemotes().length)
      && !this._shouldYieldForBundledLanding()
    ) {
      await this.loadRemotesForPath(landingPath)
    }

    this.initialized = true
  }

  /**
   * Оболочка и bundled-маршрут не качают remotes на старте.
   * Глубокая ссылка на remote догружает их до создания роутера.
   */
  _shouldYieldForBundledLanding() {
    if (typeof window === 'undefined') {
      return true
    }
    if (clientEnv.modularity !== 'federated' && !getConfiguredModuleRemotes().length) {
      return true
    }
    const pathname = window.location.pathname || '/'
    if (routesCoverPath([...coreRoutes, ...authRoutes], pathname)) {
      return true
    }
    return routeMapCoversPath(this.routeManager.getAllRoutes(), pathname)
  }

  /**
   * @param {import('./core/clientModuleManifest.js').ClientModuleManifest[]} remotes
   */
  async _registerFederatedManifests(remotes) {
    for (const manifest of remotes) {
      if (!manifest?.moduleKey || this._loadedRemoteKeys.has(manifest.moduleKey)) {
        continue
      }
      try {
        await this.registerModule(manifest, `remote:${manifest.moduleKey}`)
        this._loadedRemoteKeys.add(manifest.moduleKey)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ergo-remotes-changed'))
        }
      } catch (error) {
        logError(
          `[federated] Не удалось зарегистрировать remote ${manifest.moduleKey}`,
          error,
        )
      }
    }
  }

  /**
   * Есть remote из CLIENT_MODULE_REMOTES, который ещё не зарегистрирован.
   * @returns {boolean}
   */
  hasPendingRemotes() {
    return getConfiguredModuleRemotes().some((item) => !this._loadedRemoteKeys.has(item.name))
  }

  /**
   * Грузит ещё не поднятые remotes по одному.
   * С pathname останавливается, как только маршрут покрыт: соседние модули не качаются.
   * Без pathname (меню приложений) догружает все оставшиеся.
   * @param {string} [pathname]
   * @returns {Promise<boolean>}
   */
  loadRemotesForPath(pathname = '') {
    return this._enqueueRemoteWork(async () => {
      const configured = getConfiguredModuleRemotes()
      for (const item of configured) {
        if (this._loadedRemoteKeys.has(item.name)) {
          if (pathname && this._pathCoveredByRemotes(pathname)) {
            return true
          }
          continue
        }
        try {
          await this._loadRemoteByName(item.name)
        } catch (error) {
          logError(`[federated] Не удалось загрузить remote ${item.name}`, error)
        }
        if (pathname && this._pathCoveredByRemotes(pathname)) {
          return true
        }
      }
      return pathname ? this._pathCoveredByRemotes(pathname) : true
    })
  }

  /**
   * Пункт бокового меню ссылается на имя маршрута, которого ещё нет в таблице.
   * Грузит remotes по одному, пока имя не появится.
   * @param {string} routeName
   * @returns {Promise<boolean>}
   */
  loadRemotesUntilRoute(routeName) {
    const name = String(routeName || '')
    return this._enqueueRemoteWork(async () => {
      if (!name || this.routeManager?.hasRoute?.(name)) {
        return Boolean(name && this.routeManager?.hasRoute?.(name))
      }
      const configured = getConfiguredModuleRemotes()
      for (const item of configured) {
        if (this.routeManager?.hasRoute?.(name)) {
          return true
        }
        if (this._loadedRemoteKeys.has(item.name)) {
          continue
        }
        try {
          await this._loadRemoteByName(item.name)
        } catch (error) {
          logError(`[federated] Не удалось загрузить remote ${item.name}`, error)
        }
        if (this.routeManager?.hasRoute?.(name)) {
          return true
        }
      }
      return Boolean(this.routeManager?.hasRoute?.(name))
    })
  }

  /**
   * Страница уже открыта своим модулем, а панель в слот кладёт другой remote.
   * Грузит оставшиеся по одному, пока в группе моста не появится запись.
   * @param {string} group
   * @returns {Promise<boolean>}
   */
  loadRemotesUntilGroup(group) {
    const name = String(group || '')
    return this._enqueueRemoteWork(async () => {
      if (!name || this._bridgeGroupHasEntries(name)) {
        return Boolean(name && this._bridgeGroupHasEntries(name))
      }
      const configured = getConfiguredModuleRemotes()
      for (const item of configured) {
        if (this._bridgeGroupHasEntries(name)) {
          return true
        }
        if (this._loadedRemoteKeys.has(item.name)) {
          continue
        }
        try {
          await this._loadRemoteByName(item.name)
        } catch (error) {
          logError(`[federated] Не удалось загрузить remote ${item.name}`, error)
        }
        if (this._bridgeGroupHasEntries(name)) {
          return true
        }
      }
      return this._bridgeGroupHasEntries(name)
    })
  }

  /**
   * @param {string} group
   * @returns {boolean}
   */
  _bridgeGroupHasEntries(group) {
    const entries = bridge.all(group)
    return Boolean(entries && typeof entries === 'object' && Object.keys(entries).length)
  }

  /**
   * Меню приложений: все remotes, которые ещё не подняты.
   * @returns {Promise<void>}
   */
  async retryMissingRemotes() {
    if (!this.hasPendingRemotes()) {
      return
    }
    await this.loadRemotesForPath('')
  }

  /**
   * @param {string} pathname
   * @returns {boolean}
   */
  _pathCoveredByRemotes(pathname) {
    return routeMapCoversPath(this.routeManager.getAllRoutes(), pathname)
  }

  /**
   * @param {() => Promise<boolean>} work
   * @returns {Promise<boolean>}
   */
  _enqueueRemoteWork(work) {
    const run = this._remoteChain.then(work, work)
    this._remoteChain = run.then(() => undefined, () => undefined)
    return run
  }

  /**
   * @param {string} name
   * @returns {Promise<void>}
   */
  async _loadRemoteByName(name) {
    if (this._loadedRemoteKeys.has(name)) {
      return
    }
    const manifests = await loadFederatedModules([name])
    if (!manifests.length) {
      return
    }
    await this._registerFederatedManifests(manifests)
    this._loadedRemoteKeys.add(name)
  }

  /**
   * Регистрирует клиентский манифест модуля (federated / standalone / ручной).
   * @param {object} manifest
   * @param {string} [sourcePath]
   */
  async registerModule(manifest, sourcePath = 'manifest') {
    const registered = await registerClientModule(manifest, {
      routeManager: this.routeManager,
      endpointManager: this.endpointManager,
      permissionRulesManager: this.permissionRulesManager,
      permissionSectionsManager: this.permissionSectionsManager,
      routeGuardsManager: this.routeGuardsManager,
      integrationsManager: this.integrationsManager,
      localeManager: getLocaleManager(),
      themeDefaultsManager: getThemeDefaultsManager(),
    }, sourcePath)
    if (registered) {
      this.registeredManifests.push(registered)
      try {
        await getLocaleManager().mergeModuleLocales()
      } catch {
        /* locales optional at early boot */
      }
      // Proxy endpoints кэширует снимок до remotes — обновить без циклического import.
      try {
        const { syncEndpointsCache } = await import('@/js/api/endpoints.js')
        syncEndpointsCache()
      } catch {
        /* boot до загрузки endpoints.js */
      }
    }
    return registered
  }

  /**
   * Получает все роуты для Vue Router
   * @param {Array} coreRoutes - базовые роуты системы
   * @returns {Array}
   */
  async generateAllRoutes(coreRoutes = []) {
    await this.ensureCoreReady()
    return this.routeGenerator.generateAllRoutes(coreRoutes)
  }

  /**
   * Получает все эндпоинты
   * @returns {Object}
   */
  async getEndpoints() {
    await this.ensureCoreReady()
    return this.endpointManager.getAllEndpoints()
  }

  /**
   * Получает все правила проверки прав
   * @returns {Array}
   */
  async getPermissionRules() {
    await this.ensureCoreReady()
    return this.permissionRulesManager.getAllRules()
  }

  /**
   * Получает все route guards модулей и ядра (в алфавитном порядке по модулю)
   * @returns {Function[]}
   */
  async getRouteGuards() {
    await this.ensureCoreReady()
    return this.routeGuardsManager.getAllGuards()
  }

  /**
   * Получает все секции прав модулей
   * @returns {Array}
   */
  async getPermissionSections() {
    await this.ensureInitialized()
    await this.ensurePermissionSectionsInitialized()
    return this.permissionSectionsManager.getAllSections()
  }

  /**
   * Формирует начальное состояние прав из всех секций
   * @param {Array} [sections] - секции (по умолчанию все обнаруженные)
   * @returns {Object}
   */
  async buildInitialPermissionState(sections) {
    await this.ensureInitialized()
    await this.ensurePermissionSectionsInitialized()
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
      routeGuards: this.routeGuardsManager.getStatistics(),
      integrations: this.integrationsManager.getStatistics(),
      manifests: this.registeredManifests.length,
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
    this.routeGuardsManager.clearCache()
    this.integrationsManager.clearCache()
    this.registeredManifests = []
    this.initialized = false
    this.coreReady = false
    this._initPromise = null
    this._coreReadyPromise = null
    this._resolveCoreReady = null
    this._loadedRemoteKeys = new Set()
    this._retryRemotesPromise = null
  }

  /**
   * Ядровые менеджеры готовы. Remotes могут ещё грузиться — сессия уже может идти.
   */
  async ensureCoreReady() {
    if (this.coreReady) {
      return
    }
    this._startInitialize()
    await this._coreReadyPromise
  }

  /**
   * Обеспечивает инициализацию
   */
  async ensureInitialized() {
    if (this.initialized) {
      return
    }
    this._startInitialize()
    await this._initPromise
  }

  async ensurePermissionSectionsInitialized() {
    if (!this.permissionSectionsManager.initialized) {
      await this.permissionSectionsManager.initialize()
    }
  }

  /**
   * Подгружает список disabled-модулей с API (silent, не блокирует запуск при ошибке).
   * Вызывать после успешной аутентификации для синхронизации с сервером.
   * @param {Object} apiClient - инстанс axios/api manager
   */
  async refreshDisabledModules(apiClient) {
    try {
      if (apiClient) {
        await fetchDisabledModules(apiClient)
      }
    } catch {
      // Если API недоступен — используется DISABLED_MODULES из .env
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

  get routeGuards() {
    return this.routeGuardsManager
  }

  get integrations() {
    return this.integrationsManager
  }
}

export default ModuleManager
