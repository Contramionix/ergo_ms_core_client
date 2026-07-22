/**
 * Реестр layout-плагинов модулей через ModuleBridge.
 *
 * Модули: bridge.provideMany('layout.plugin_registry', moduleKey, { ... })
 */

import bridge from '@/integrations/ModuleBridge.js'

export const LAYOUT_PLUGIN_REGISTRY_GROUP = 'layout.plugin_registry'

/**
 * @returns {Record<string, { routeNamePrefixes?: string[], offcanvasPages?: string[] }>}
 */
export function getLayoutPluginRegistryEntries() {
  return bridge.all(LAYOUT_PLUGIN_REGISTRY_GROUP)
}

/**
 * @param {string|null|undefined} routeName
 * @returns {string|null}
 */
export function resolveModuleFromRouteName(routeName) {
  if (!routeName || typeof routeName !== 'string') {
    return null
  }

  for (const [moduleName, entry] of Object.entries(getLayoutPluginRegistryEntries())) {
    const prefixes = entry?.routeNamePrefixes || []
    for (const prefix of prefixes) {
      if (prefix && routeName.startsWith(prefix)) {
        return moduleName
      }
    }
  }

  return null
}

/**
 * @param {string|null|undefined} page
 * @returns {string|null}
 */
export function resolveModuleFromOffcanvasPage(page) {
  if (!page || typeof page !== 'string') {
    return null
  }

  for (const [moduleName, entry] of Object.entries(getLayoutPluginRegistryEntries())) {
    const pages = entry?.offcanvasPages || []
    if (pages.includes(page)) {
      return moduleName
    }
  }

  return null
}
