/**
 * Единый контракт клиентского манифеста модуля
 * (bundled adapter / federated remote / standalone SPA).
 *
 * @typedef {object} ClientModuleManifest
 * @property {string} moduleKey
 * @property {Record<string, object>=} routes
 * @property {Record<string, unknown>=} endpoints
 * @property {unknown=} integrations — side-effect модуль или { default } / функция
 * @property {Record<string, object>|object=} locales
 * @property {Array<object>=} permissionRules
 * @property {Array<object>|object=} permissionSections
 * @property {Function=} routeGuard
 * @property {object=} themeDefaults
 */

/**
 * Federation отдаёт `import * as hook` → `{ <name>Endpoints: { <name>: … } }`.
 * Снимаем только ключ-обёртку экспорта. Иначе единственное пространство имён
 * модуля схлопывается, и разные remotes получают одинаковые плоские ключи.
 * @param {Record<string, unknown>} endpoints
 * @returns {Record<string, unknown>}
 */
function unwrapEndpointModuleExport(endpoints) {
  const keys = Object.keys(endpoints)
  if (keys.length !== 1) {
    return endpoints
  }
  const [key] = keys
  const only = endpoints[key]
  if (!only || typeof only !== 'object' || Array.isArray(only)) {
    return endpoints
  }
  if ('moduleKey' in only) {
    return endpoints
  }
  const isWrapper = key === 'default' || key === 'endpoints' || /Endpoints$/i.test(key)
  return isWrapper ? /** @type {Record<string, unknown>} */ (only) : endpoints
}

/**
 * @param {unknown} raw
 * @param {string} [fallbackKey]
 * @returns {ClientModuleManifest|null}
 */
export function normalizeClientModuleManifest(raw, fallbackKey = '') {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const source = /** @type {Record<string, unknown>} */ (raw.default && typeof raw.default === 'object'
    ? raw.default
    : raw)

  const moduleKey = String(source.moduleKey || fallbackKey || '').trim()
  if (!moduleKey) {
    return null
  }

  let routes = source.routes
  if (routes && typeof routes === 'object' && 'default' in /** @type {object} */ (routes)) {
    routes = /** @type {{ default: unknown }} */ (routes).default
  }

  let endpoints = source.endpoints
  if (endpoints && typeof endpoints === 'object') {
    endpoints = unwrapEndpointModuleExport(endpoints)
  }

  let permissionRules = source.permissionRules
  if (permissionRules && typeof permissionRules === 'object' && !Array.isArray(permissionRules)) {
    permissionRules = /** @type {{ default?: unknown }} */ (permissionRules).default ?? permissionRules
  }

  let routeGuard = source.routeGuard
  if (routeGuard && typeof routeGuard === 'object') {
    const g = /** @type {{ default?: unknown, routeGuard?: unknown }} */ (routeGuard)
    routeGuard = g.routeGuard || g.default || null
  }

  let locales = source.locales
  if (locales && typeof locales === 'object' && 'default' in /** @type {object} */ (locales)) {
    locales = /** @type {{ default: unknown }} */ (locales).default
  }

  let themeDefaults = source.themeDefaults
  if (themeDefaults && typeof themeDefaults === 'object' && 'default' in /** @type {object} */ (themeDefaults)) {
    themeDefaults = /** @type {{ default: unknown }} */ (themeDefaults).default
  }

  let permissionSections = source.permissionSections
  if (
    permissionSections &&
    typeof permissionSections === 'object' &&
    'default' in /** @type {object} */ (permissionSections)
  ) {
    permissionSections = /** @type {{ default: unknown }} */ (permissionSections).default
  }

  return {
    moduleKey,
    routes: routes && typeof routes === 'object' ? /** @type {Record<string, object>} */ (routes) : undefined,
    endpoints: endpoints && typeof endpoints === 'object' ? /** @type {Record<string, unknown>} */ (endpoints) : undefined,
    integrations: source.integrations,
    locales: locales && typeof locales === 'object' ? locales : undefined,
    permissionRules: Array.isArray(permissionRules) ? permissionRules : undefined,
    permissionSections:
      permissionSections && typeof permissionSections === 'object' ? permissionSections : undefined,
    routeGuard: typeof routeGuard === 'function' ? routeGuard : undefined,
    themeDefaults: themeDefaults && typeof themeDefaults === 'object' ? themeDefaults : undefined,
  }
}

/**
 * Собирает манифест из отдельных hook-экспортов (bundled adapter).
 * @param {string} moduleKey
 * @param {Record<string, unknown>} hooks
 */
export function manifestFromHooks(moduleKey, hooks = {}) {
  return normalizeClientModuleManifest({
    moduleKey,
    routes: hooks.routes,
    endpoints: hooks.endpoints,
    integrations: hooks.integrations,
    locales: hooks.locales,
    permissionRules: hooks.permissionRules,
    permissionSections: hooks.permissionSections,
    routeGuard: hooks.routeGuard,
    themeDefaults: hooks.themeDefaults,
  })
}
