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
      entries.push({ moduleName, path, guard })
    })

    entries.sort((a, b) => a.moduleName.localeCompare(b.moduleName, 'ru'))
    this.guards = entries
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
