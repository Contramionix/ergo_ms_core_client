/**
 * Загрузка theme-defaults.js из модулей (hook для модульных тем).
 */
import { tGlobal } from '@/i18n/index.js'
import { ModuleLoader } from '@/modules/core/ModuleLoader.js'

let registryPromise = null
const registry = new Map()

export class ThemeDefaultsManager extends ModuleLoader {
  async loadRegistry() {
    if (registryPromise) {
      return registryPromise
    }

    registryPromise = (async () => {
      registry.clear()
      const modules = await this.loadAllModulesAsync('js/theme-defaults.js')
      for (const [, mod] of Object.entries(modules)) {
        const manifest = mod.default || mod
        this._putManifest(manifest)
      }
      return registry
    })()

    return registryPromise
  }

  /**
   * @param {object} manifest
   * @param {string} [fallbackKey]
   */
  _putManifest(manifest, fallbackKey = '') {
    const moduleKey = manifest?.moduleKey || manifest?.module_key || fallbackKey
    if (!moduleKey) {
      return
    }
    registry.set(moduleKey, {
      moduleKey,
      displayName: manifest.displayName || manifest.display_name || moduleKey,
      modulePair: manifest.modulePair || manifest.module_pair || 'default',
      baseTheme: manifest.baseTheme || manifest.base_theme || 'light',
      colors: manifest.colors || {},
      bootstrap_colors: manifest.bootstrap_colors || manifest.bootstrapColors || {},
      moduleTokens: manifest.moduleTokens || manifest.module_tokens || {},
      systemThemes: manifest.systemThemes || manifest.system_themes || null,
    })
  }

  /**
   * @param {object} themeDefaults
   * @param {string} moduleKey
   */
  registerThemeDefaultsFromManifest(themeDefaults, moduleKey) {
    this._putManifest(themeDefaults, moduleKey)
  }

  async getAll() {
    const map = await this.loadRegistry()
    return Array.from(map.values())
  }

  async getByModuleKey(moduleKey) {
    const map = await this.loadRegistry()
    return map.get(moduleKey) || null
  }

  async getScopeOptions() {
    const modules = await this.getAll()
    return [
      { id: 'site', name: tGlobal('settings.themes.site') },
      ...modules.map((m) => ({ id: m.moduleKey, name: m.displayName })),
    ]
  }
}

let sharedManager = null

export function getThemeDefaultsManager() {
  if (!sharedManager) {
    sharedManager = new ThemeDefaultsManager()
  }
  return sharedManager
}

export async function preloadModuleThemeManifests() {
  return getThemeDefaultsManager().loadRegistry()
}

/** Модуль объявил hook theme-defaults.js — для него есть отдельная палитра. */
export async function isModuleThemeRegistered(moduleKey) {
  if (!moduleKey) {
    return false
  }
  const manager = getThemeDefaultsManager()
  return Boolean(await manager.getByModuleKey(moduleKey))
}
