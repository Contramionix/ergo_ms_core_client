/**
 * МЕНЕДЖЕР РЕГИСТРАЦИИ ИНТЕГРАЦИЙ МОДУЛЕЙ
 *
 * Загружает и активирует все файлы integrations.js из core и внешних модулей.
 * Каждый такой файл — это side-effect модуль, который при импорте регистрирует
 * операции/подписки в глобальном ModuleBridge через bridge.provide(...) / bridge.subscribe(...).
 *
 * Менеджер не хранит состояние провайдеров — это забота ModuleBridge.
 * Его задача — найти все integrations.js и убедиться, что они были загружены.
 */

import { ModuleLoader } from '../core/ModuleLoader.js'

export class IntegrationsManager extends ModuleLoader {
  constructor() {
    super()
    this.loadedModules = []
    this.initialized = false
  }

  async initialize() {
    if (this.initialized) {
      return
    }

    const integrationsModules = await this.loadAllModulesAsync('js/integrations.js')

    Object.keys(integrationsModules).forEach((path) => {
      this.loadedModules.push(path)
    })

    this.initialized = true
  }

  /**
   * Активирует integrations из манифеста (side-effect import или функция).
   * @param {unknown} integrations
   * @param {string} pathTag
   */
  async activateIntegrationsFromManifest(integrations, pathTag) {
    if (!integrations) {
      return
    }
    if (integrations === true) {
      this.loadedModules.push(pathTag)
      return
    }
    if (typeof integrations === 'function') {
      await integrations()
      this.loadedModules.push(pathTag)
      return
    }
    if (typeof integrations === 'object') {
      const maybeInit = /** @type {{ default?: unknown, activate?: unknown }} */ (integrations)
      if (typeof maybeInit.activate === 'function') {
        await maybeInit.activate()
      } else if (typeof maybeInit.default === 'function') {
        await maybeInit.default()
      }
      // side-effect модуль уже исполнен при import federation-entry
      this.loadedModules.push(pathTag)
    }
  }

  getLoadedIntegrations() {
    return this.loadedModules.slice()
  }

  getStatistics() {
    return {
      total: this.loadedModules.length,
      paths: this.loadedModules.slice(),
    }
  }

  clearCache() {
    this.loadedModules = []
    this.initialized = false
  }
}

export default IntegrationsManager
