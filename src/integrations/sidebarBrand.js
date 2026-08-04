/**
 * Реестр расширений бренда в шапке сайдбара / mobile header.
 *
 * Модули: bridge.provideMany(SHELL_SIDEBAR_BRAND_GROUP, key, {
 *   id, component, order?, match?, to?, measureText?,
 * }).
 * Ядро подменяет SiteWordmark активным провайдером; без match — дефолтный wordmark.
 */

import bridge from '@/integrations/ModuleBridge.js'
import { moduleManager } from '@/modules/index.js'

export const SHELL_SIDEBAR_BRAND_GROUP = 'shell.sidebar_brand'

/**
 * @typedef {Object} SidebarBrandContext
 * @property {import('vue-router').RouteLocationNormalizedLoaded} route
 * @property {boolean} [compact]
 */

/**
 * @typedef {Object} SidebarBrandRegistration
 * @property {string} id
 * @property {import('vue').Component} component
 * @property {number} [order]
 * @property {(ctx: SidebarBrandContext) => boolean} [match]
 * @property {import('vue-router').RouteLocationRaw} [to]
 * @property {string} [measureText]
 */

/**
 * @returns {Promise<SidebarBrandRegistration[]>}
 */
export async function collectSidebarBrandProviders() {
  if (!moduleManager.initialized) {
    await moduleManager.initialize()
  }

  return Object.values(bridge.all(SHELL_SIDEBAR_BRAND_GROUP))
    .filter((entry) => entry?.id && entry?.component)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * Синхронный снимок уже загруженных провайдеров (после IntegrationsManager).
 * @returns {SidebarBrandRegistration[]}
 */
export function listSidebarBrandProviders() {
  return Object.values(bridge.all(SHELL_SIDEBAR_BRAND_GROUP))
    .filter((entry) => entry?.id && entry?.component)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * @param {SidebarBrandContext} ctx
 * @returns {SidebarBrandRegistration | null}
 */
export function resolveSidebarBrand(ctx) {
  const providers = listSidebarBrandProviders()
  for (const provider of providers) {
    if (typeof provider.match === 'function') {
      try {
        if (!provider.match(ctx)) {
          continue
        }
      } catch {
        continue
      }
    }
    return provider
  }
  return null
}
