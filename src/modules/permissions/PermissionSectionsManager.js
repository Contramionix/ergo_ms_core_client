/**
 * МЕНЕДЖЕР СЕКЦИЙ ПРАВ МОДУЛЕЙ
 *
 * Загружает и агрегирует конфигурации секций прав (permission-sections.js)
 * из всех модулей системы (core и внешние) через import.meta.glob.
 *
 * Каждый модуль может определить свои секции прав в файле permission-sections.js,
 * экспортируя объект секции или массив секций в унифицированном формате.
 */

import { ModuleLoader } from '../core/ModuleLoader.js'

import { logWarn } from '@/js/utils/logError.js'

export class PermissionSectionsManager extends ModuleLoader {
  constructor() {
    super()
    this.sections = []
    this.sectionsMap = new Map()
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) {
      return
    }

    await this.loadPermissionSections()
    this.initialized = true
  }

  async loadPermissionSections() {
    const modules = await this.loadAllModulesAsync('js/permission-sections.js')

    Object.entries(modules).forEach(([path, module]) => {
      const exported = module?.default ?? module
      if (!exported) {
        return
      }

      const items = Array.isArray(exported) ? exported : [exported]

      items.forEach((section) => {
        if (!this.validateSection(section)) {
          logWarn(`[PermissionSectionsManager] Невалидная секция в ${path}`)
          return
        }

        if (this.sectionsMap.has(section.id)) {
          return
        }

        const entry = { ...section, _modulePath: path }
        this.sections.push(entry)
        this.sectionsMap.set(section.id, entry)
      })
    })
  }

  validateSection(section) {
    if (!section || typeof section !== 'object') {
      return false
    }
    if (typeof section.id !== 'string' || !section.id) {
      return false
    }
    if (typeof section.title !== 'string' || !section.title) {
      return false
    }
    if (!Array.isArray(section.items) || section.items.length === 0) {
      return false
    }
    return section.items.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        Array.isArray(item.actions) &&
        item.actions.length > 0
    )
  }

  getAllSections() {
    return [...this.sections]
  }

  getSectionById(id) {
    return this.sectionsMap.get(id) || null
  }

  buildInitialPermissionState(sections) {
    const target = sections || this.sections
    const state = {}

    target.forEach((section) => {
      section.items.forEach((item) => {
        item.actions.forEach((action) => {
          const key = `${item.id}.${action.id}`
          state[key] = action.defaultState || 'not_configured'
        })
      })
    })

    return state
  }

  getStatistics() {
    const moduleStats = {}

    this.sections.forEach((section) => {
      const moduleName = section.module_name || section.id
      moduleStats[moduleName] = (moduleStats[moduleName] || 0) + section.items.length
    })

    return {
      totalSections: this.sections.length,
      totalPermissions: this.sections.reduce((sum, s) => sum + s.items.length, 0),
      byModule: moduleStats,
    }
  }

  clearCache() {
    super.clearCache()
    this.sections = []
    this.sectionsMap.clear()
    this.initialized = false
  }
}

export default PermissionSectionsManager
