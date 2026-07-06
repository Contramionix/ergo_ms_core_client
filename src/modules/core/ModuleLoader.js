/**
 * БАЗОВЫЙ КЛАСС ДЛЯ ЗАГРУЗКИ МОДУЛЕЙ
 * 
 * Предоставляет базовую функциональность для загрузки файлов
 * из core и внешних модулей с поддержкой кеширования
 * 
 * Vite требует статические паттерны для import.meta.glob,
 * поэтому загружаем все файлы заранее и фильтруем по необходимости
 * 
 * ВАЖНО: Все глобы загружаются ОДИН РАЗ при импорте этого модуля (top-level),
 * что объединяет все запросы в один пакет при инициализации приложения.
 */

import { getDisabledModulesSync } from './disabledModules.js'

// Глобальный кеш для результатов loadAllModulesAsync
const asyncModulesCache = new Map()

// ============================================================================
// ЗАГРУЗКА ВСЕХ ГЛОБОВ ОДИН РАЗ ПРИ ИМПОРТЕ МОДУЛЯ (TOP-LEVEL)
// Это гарантирует, что все файлы загружаются одним пакетом
// ============================================================================
const sharedGlobs = {
  // Core модули - routes, endpoints, permission-rules
  // routes и endpoints — lazy (как permission-rules), чтобы не раздувать initial chunk
  coreRoutes: import.meta.glob('../../core/**/js/routes.js'),
  coreEndpoints: import.meta.glob('../../core/**/js/endpoints.js'),
  corePermissionRules: import.meta.glob('../../core/**/js/permission-rules.js'),
  corePermissionSections: import.meta.glob('../../core/**/js/permission-sections.js'),
  
  // Core компоненты (lazy loading)
  coreComponents: import.meta.glob('../../**/*.vue'),
  
  // External модули - routes (в т.ч. вложенные, например client/edu-space-tasks/js/routes.js)
  modulesRoutes: {
    ...import.meta.glob('../../../../../modules/*/client/js/routes.js'),
    ...import.meta.glob('../../../../../modules/*/client/**/js/routes.js')
  },
  modulesEndpoints: import.meta.glob('../../../../../modules/*/client/js/endpoints.js'),
  modulesPermissionRules: import.meta.glob('../../../../../modules/*/client/js/permission-rules.js'),
  modulesPermissionSections: {
    ...import.meta.glob('../../../../../modules/*/client/js/permission-sections.js'),
    ...import.meta.glob('../../../../../modules/*/client/**/js/permission-sections.js')
  },
  // Интеграции с ModuleBridge (регистрация capabilities/events модуля)
  //
  // ВАЖНО: загружаем лениво (без eager), чтобы integrations.js-файлы не
  // исполнялись на стадии импорта ModuleLoader.js. Это ломает циклическую
  // цепочку `@/modules/index.js` -> ModuleManager -> IntegrationsManager ->
  // ModuleLoader -> integrations.js -> tokenService/endpoints -> `@/modules/index.js`.
  // integrations.js грузится асинхронно в IntegrationsManager.initialize(),
  // когда moduleManager уже полностью инициализирован.
  coreIntegrations: import.meta.glob('../../core/**/js/integrations.js'),
  modulesIntegrations: {
    ...import.meta.glob('../../../../../modules/*/client/js/integrations.js'),
    ...import.meta.glob('../../../../../modules/*/client/**/js/integrations.js')
  },

  // External компоненты (lazy loading)
  modulesComponents: import.meta.glob('../../../../../modules/**/client/**/*.vue')
}

export class ModuleLoader {
  constructor() {
    this.cache = new Map()
    // Используем глобы, загруженные при импорте модуля (top-level)
    this.globs = sharedGlobs
  }

  /**
   * Получает глобы для конкретного типа файлов
   * @param {string} type - тип файлов (routes, endpoints, components)
   * @param {string} source - источник (core, modules, all)
   * @returns {Object}
   */
  getGlobsByType(type, source = 'all') {
    const typeMap = {
      'js/routes.js': ['coreRoutes', 'modulesRoutes'],
      'js/endpoints.js': ['coreEndpoints', 'modulesEndpoints'],
      'js/permission-rules.js': ['corePermissionRules', 'modulesPermissionRules'],
      'js/permission-sections.js': ['corePermissionSections', 'modulesPermissionSections'],
      'js/integrations.js': ['coreIntegrations', 'modulesIntegrations'],
      'components': ['coreComponents', 'modulesComponents']
    }

    const keys = typeMap[type] || []
    let result = {}

    keys.forEach(key => {
      if (source === 'all' || 
          (source === 'core' && key.startsWith('core')) ||
          (source === 'modules' && key.startsWith('modules'))) {
        const globData = this.globs[key] || {}
        result = { ...result, ...globData }
      }
    })

    return this._filterDisabledModules(result)
  }

  /**
   * Фильтрует результаты glob, исключая отключённые модули
   * @param {Object} globResult - объект { path: module }
   * @returns {Object} - отфильтрованный объект
   */
  _filterDisabledModules(globResult) {
    const disabled = getDisabledModulesSync()
    if (!disabled.size) return globResult

    const filtered = {}
    for (const [path, value] of Object.entries(globResult)) {
      const moduleName = this.extractModuleName(path, this.isExternalModule(path))
      if (moduleName && disabled.has(moduleName)) continue
      filtered[path] = value
    }
    return filtered
  }

  /**
   * Загружает файлы из core модулей
   * @param {string} pattern - паттерн для поиска файлов
   * @param {boolean} eager - загружать ли файлы сразу (не используется, для совместимости)
   * @returns {Object} - объект с загруженными модулями
   */
  loadCoreModules(pattern, eager = false) {
    return this.getGlobsByType(pattern, 'core')
  }

  /**
   * Загружает файлы из внешних модулей
   * @param {string} pattern - паттерн для поиска файлов
   * @param {boolean} eager - загружать ли файлы сразу (не используется, для совместимости)
   * @returns {Object} - объект с загруженными модулями
   */
  loadExternalModules(pattern, eager = false) {
    return this.getGlobsByType(pattern, 'modules')
  }

  /**
   * Загружает файлы из core и внешних модулей одновременно
   * @param {string} pattern - паттерн для поиска файлов
   * @param {boolean} eager - загружать ли файлы сразу (не используется, для совместимости)
   * @returns {Object} - объединенный объект с загруженными модулями
   */
  loadAllModules(pattern, eager = false) {
    return this.getGlobsByType(pattern, 'all')
  }

  /**
   * Асинхронная загрузка всех модулей с промисами
   * @param {string} pattern - паттерн для поиска файлов
   * @returns {Promise<Object>} - промис с загруженными модулями
   */
  async loadAllModulesAsync(pattern) {
    // Проверяем кеш для этого паттерна
    if (asyncModulesCache.has(pattern)) {
      return asyncModulesCache.get(pattern)
    }
    
    const modules = this.loadAllModules(pattern)
    const loaded = {}

    await Promise.all(
      Object.entries(modules).map(async ([path, loader]) => {
        if (typeof loader === 'function') {
          const module = await loader()
          loaded[path] = module?.default ?? module
        } else {
          loaded[path] = loader?.default ?? loader
        }
      })
    )
    
    // Кешируем результат
    asyncModulesCache.set(pattern, loaded)
    return loaded
  }

  /**
   * Извлекает имя модуля из пути
   * @param {string} path - путь к файлу модуля
   * @param {boolean} isExternal - является ли модуль внешним
   * @returns {string} - имя модуля
   */
  extractModuleName(path, isExternal = false) {
    if (isExternal) {
      // ../../../../../modules/video_analysis/client/js/... -> video_analysis
      const match = path.match(/modules\/([^/]+)\/client/)
      return match ? match[1] : null
    } else {
      // ../../core/cms/js/... -> cms
      const match = path.match(/core\/([^/]+)/)
      return match ? match[1] : null
    }
  }

  /**
   * Определяет, является ли путь внешним модулем
   * @param {string} path - путь к файлу
   * @returns {boolean}
   */
  isExternalModule(path) {
    return path.includes('/modules/')
  }

  /**
   * Очищает весь кеш
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Очищает кеш для конкретного паттерна
   * @param {string} pattern - паттерн для очистки
   */
  clearCacheByPattern(pattern) {
    const keysToDelete = []
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

export default ModuleLoader

