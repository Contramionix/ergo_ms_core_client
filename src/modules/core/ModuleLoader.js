/**
 * БАЗОВЫЙ КЛАСС ДЛЯ ЗАГРУЗКИ МОДУЛЕЙ
 * 
 * Предоставляет базовую функциональность для загрузки файлов
 * из core и внешних модулей с поддержкой кеширования
 * 
 * Vite требует статические паттерны для import.meta.glob,
 * поэтому загружаем все файлы заранее и фильтруем по необходимости
 */

export class ModuleLoader {
  constructor() {
    this.cache = new Map()
    this.initializeGlobs()
  }

  /**
   * Инициализирует все необходимые глобы со статическими паттернами
   */
  initializeGlobs() {
    // Загружаем все необходимые типы файлов статическими паттернами
    this.globs = {
      coreRoutes: import.meta.glob('../../core/**/js/routes.js', { eager: true }),
      coreMenuConfigs: import.meta.glob('../../core/**/js/menu-config.json'),
      coreEndpoints: import.meta.glob('../../core/**/js/endpoints.js', { eager: true }),
      coreComponents: import.meta.glob('../../**/*.vue'),
      corePermissionRules: import.meta.glob('../../core/**/js/permission-rules.js', { eager: true }),
      
      modulesRoutes: import.meta.glob('../../../../../modules/*/client/js/routes.js', { eager: true }),
      modulesMenuConfigs: import.meta.glob('../../../../../modules/*/client/js/menu-config.json'),
      modulesEndpoints: import.meta.glob('../../../../../modules/*/client/js/endpoints.js', { eager: true }),
      modulesComponents: import.meta.glob('../../../../../modules/**/client/**/*.vue'),
      modulesPermissionRules: import.meta.glob('../../../../../modules/*/client/js/permission-rules.js', { eager: true })
    }
  }

  /**
   * Получает глобы для конкретного типа файлов
   * @param {string} type - тип файлов (routes, menu-config, endpoints, components)
   * @param {string} source - источник (core, modules, all)
   * @returns {Object}
   */
  getGlobsByType(type, source = 'all') {
    const typeMap = {
      'js/routes.js': ['coreRoutes', 'modulesRoutes'],
      'js/menu-config.json': ['coreMenuConfigs', 'modulesMenuConfigs'],
      'js/endpoints.js': ['coreEndpoints', 'modulesEndpoints'],
      'js/permission-rules.js': ['corePermissionRules', 'modulesPermissionRules'],
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

    return result
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
    const modules = this.loadAllModules(pattern)
    const loaded = {}

    await Promise.all(
      Object.entries(modules).map(async ([path, loader]) => {
        // Проверяем, является ли loader функцией (lazy) или уже загруженным модулем (eager)
        if (typeof loader === 'function') {
          const module = await loader()
          loaded[path] = module.default || module
        } else {
          loaded[path] = loader.default || loader
        }
      })
    )

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

