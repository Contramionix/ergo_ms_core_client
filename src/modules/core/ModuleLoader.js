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
import * as generatedGlobs from './sharedGlobs.generated.js'

// Глобальный кеш для результатов loadAllModulesAsync
const asyncModulesCache = new Map()

// ============================================================================
// Globs: core — статически; modules — из sharedGlobs.generated.js (prebuild)
// ============================================================================
const sharedGlobs = {
  coreRoutes: generatedGlobs.coreRoutes,
  coreEndpoints: generatedGlobs.coreEndpoints,
  corePermissionRules: generatedGlobs.corePermissionRules,
  corePermissionSections: generatedGlobs.corePermissionSections,
  coreRouteGuards: generatedGlobs.coreRouteGuards,
  coreIntegrations: generatedGlobs.coreIntegrations,
  coreComponents: generatedGlobs.coreComponents,

  modulesRoutes: {
    ...generatedGlobs.modulesRoutes,
    ...generatedGlobs.modulesRoutesNested,
  },
  modulesEndpoints: generatedGlobs.modulesEndpoints,
  modulesPermissionRules: generatedGlobs.modulesPermissionRules,
  modulesPermissionSections: {
    ...generatedGlobs.modulesPermissionSections,
    ...generatedGlobs.modulesPermissionSectionsNested,
  },
  modulesRouteGuards: generatedGlobs.modulesRouteGuards,
  modulesIntegrations: {
    ...generatedGlobs.modulesIntegrations,
    ...generatedGlobs.modulesIntegrationsNested,
  },
  modulesThemeDefaults: generatedGlobs.modulesThemeDefaults,
  modulesComponents: generatedGlobs.modulesComponents,
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
      'js/routeGuard.js': ['coreRouteGuards', 'modulesRouteGuards'],
      'js/integrations.js': ['coreIntegrations', 'modulesIntegrations'],
      'js/theme-defaults.js': ['modulesThemeDefaults'],
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

