import { shallowRef } from 'vue'

import { logError } from '@/js/utils/logError.js'
import { getSessionBootstrapCache } from '@/core/cms/js/sessionBootstrapCache.js'

const layoutPluginLoaders = import.meta.glob('../../../../modules/*/client/LayoutPlugin.vue')

/** @type {Map<string, import('vue').Component>} */
const loadedPluginsByModule = new Map()

const BI_OFFCANVAS_PAGES = new Set(['datasets', 'connections', 'charts', 'dashboards'])

const ROUTE_NAME_MODULE = {
  BI: 'bi_analysis',
  LMS: 'lms',
}

function resolveModuleFromRouteName(routeName) {
  if (!routeName || typeof routeName !== 'string') {
    return null
  }
  for (const [prefix, moduleName] of Object.entries(ROUTE_NAME_MODULE)) {
    if (routeName.startsWith(prefix)) {
      return moduleName
    }
  }
  return null
}

function walkMenuItems(items, names) {
  for (const item of items || []) {
    const fromRoute = resolveModuleFromRouteName(item.route_name)
    if (fromRoute) {
      names.add(fromRoute)
    }
    if (
      item.item_type === 'offcanvas'
      && item.page
      && BI_OFFCANVAS_PAGES.has(item.page)
    ) {
      names.add('bi_analysis')
    }
    if (Array.isArray(item.children) && item.children.length) {
      walkMenuItems(item.children, names)
    }
  }
}

/**
 * @param {object|null|undefined} bootstrapData
 * @returns {string[]}
 */
export function collectModuleNamesFromBootstrap(bootstrapData) {
  const names = new Set()
  const data = bootstrapData ?? getSessionBootstrapCache()
  if (!data) {
    return []
  }

  const modulePermissions = data.permissions?.module_permissions
  if (Array.isArray(modulePermissions)) {
    for (const permission of modulePermissions) {
      if (permission?.module_name) {
        names.add(permission.module_name)
      }
    }
  }

  const menuItems = data.menu?.menu_items ?? data.menu?.items ?? []
  walkMenuItems(menuItems, names)

  return [...names]
}

function loaderForModule(moduleName) {
  const path = `../../../../modules/${moduleName}/client/LayoutPlugin.vue`
  return layoutPluginLoaders[path] ?? null
}

/**
 * @param {string[]} moduleNames
 * @returns {Promise<import('vue').Component[]>}
 */
export async function loadLayoutPluginsForModules(moduleNames) {
  const plugins = []

  for (const moduleName of moduleNames) {
    if (loadedPluginsByModule.has(moduleName)) {
      plugins.push(loadedPluginsByModule.get(moduleName))
      continue
    }

    const loader = loaderForModule(moduleName)
    if (!loader) {
      continue
    }

    try {
      const module = await loader()
      const component = module.default
      loadedPluginsByModule.set(moduleName, component)
      plugins.push(component)
    } catch (error) {
      logError(`Ошибка загрузки LayoutPlugin модуля «${moduleName}»`, error)
    }
  }

  return plugins
}

/**
 * Загружает LayoutPlugin одного модуля по требованию (offcanvas и т.п.).
 *
 * @param {string} moduleName
 * @returns {Promise<import('vue').Component|null>}
 */
export async function ensureLayoutPluginForModule(moduleName) {
  const plugins = await loadLayoutPluginsForModules([moduleName])
  return plugins[0] ?? null
}

/**
 * @param {() => string[]} getModuleNames
 * @param {(plugins: import('vue').Component[]) => void} onLoaded
 */
export function scheduleLayoutPluginsLoad(getModuleNames, onLoaded) {
  const run = () => {
    void loadLayoutPluginsForModules(getModuleNames()).then(onLoaded)
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 3000 })
  } else {
    setTimeout(run, 0)
  }
}

/**
 * @type {import('vue').ShallowRef<import('vue').Component[]>}
 */
export const layoutPluginsRef = shallowRef([])

/**
 * @param {object|null|undefined} [bootstrapData]
 */
export function scheduleLayoutPluginsFromBootstrap(bootstrapData) {
  scheduleLayoutPluginsLoad(
    () => collectModuleNamesFromBootstrap(bootstrapData),
    (plugins) => {
      layoutPluginsRef.value = plugins
    },
  )
}
