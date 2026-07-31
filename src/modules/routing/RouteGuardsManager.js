/**
 * Менеджер route guards модулей и ядра.
 *
 * Каждый модуль может экспортировать guard в client/js/routeGuard.js.
 * Подхват — через ModuleLoader; применение — в routers.js (beforeEach).
 */

import { ModuleLoader } from '../core/ModuleLoader.js'
import { logWarn } from '@/js/utils/logError.js'

export class RouteGuardsManager extends ModuleLoader {
  constructor() {
    super()
    /** @type {Array<{ moduleName: string, path: string, guard: Function }>} */
    this.guards = []
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) {
      return
    }

    await this.loadRouteGuards()
    this.initialized = true
  }

  /**
   * @param {unknown} moduleExports
   * @returns {Function|null}
   */
  _extractGuard(moduleExports) {
    if (typeof moduleExports === 'function') {
      return moduleExports
    }
    if (!moduleExports || typeof moduleExports !== 'object') {
      return null
    }
    if (typeof moduleExports.routeGuard === 'function') {
      return moduleExports.routeGuard
    }
    if (typeof moduleExports.default === 'function') {
      return moduleExports.default
    }
    return null
  }

  /**
   * @param {unknown} moduleExports
   * @returns {number}
   */
  _extractOrder(moduleExports) {
    if (!moduleExports || typeof moduleExports !== 'object') {
      return 100
    }
    if (typeof moduleExports.order === 'number') {
      return moduleExports.order
    }
    if (typeof moduleExports.routeGuardOrder === 'number') {
      return moduleExports.routeGuardOrder
    }
    return 100
  }

  _sortGuardEntries(entries) {
    entries.sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order
      }
      return a.moduleName.localeCompare(b.moduleName, 'ru')
    })
  }

  async loadRouteGuards() {
    const guardModules = await this.loadAllModulesAsync('js/routeGuard.js')
    const entries = []

    Object.entries(guardModules).forEach(([path, moduleExports]) => {
      const guard = this._extractGuard(moduleExports)
      if (!guard) {
        logWarn(`[RouteGuardsManager] ${path} не экспортирует функцию routeGuard`)
        return
      }

      const isExternal = this.isExternalModule(path)
      const moduleName = this.extractModuleName(path, isExternal) || 'core'
      entries.push({
        moduleName,
        path,
        guard,
        order: this._extractOrder(moduleExports),
      })
    })

    this._sortGuardEntries(entries)
    this.guards = entries
  }

  /**
   * @param {Function} guard
   * @param {string} moduleName
   * @param {string} pathTag
   * @param {number} [order=100]
   */
  registerGuardFromManifest(guard, moduleName, pathTag, order = 100) {
    if (typeof guard !== 'function') {
      logWarn(`[RouteGuardsManager] ${pathTag} не экспортирует функцию routeGuard`)
      return
    }
    this.guards.push({
      moduleName: moduleName || 'module',
      path: pathTag,
      guard,
      order: typeof order === 'number' ? order : 100,
    })
    this._sortGuardEntries(this.guards)
  }

  getAllGuards() {
    return this.guards.map((entry) => entry.guard)
  }

  getStatistics() {
    const byModule = {}
    this.guards.forEach(({ moduleName }) => {
      byModule[moduleName] = (byModule[moduleName] || 0) + 1
    })
    return {
      total: this.guards.length,
      byModule,
    }
  }

  clearCache() {
    super.clearCache()
    this.guards = []
    this.initialized = false
  }
}

export default RouteGuardsManager
