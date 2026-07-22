/**
 * Сопоставление путей @/... из routes.js с ключами import.meta.glob.
 */

/**
 * @param {string} componentPath
 * @returns {string|null}
 */
export function componentPathToGlobKey(componentPath) {
  if (!componentPath || typeof componentPath !== 'string') {
    return null
  }

  if (componentPath.startsWith('@/modules/')) {
    return componentPath.replace('@/modules/', '../../../../../modules/').replace(/\\/g, '/')
  }

  if (componentPath.startsWith('@/')) {
    return componentPath.replace('@/', '../../').replace(/\\/g, '/')
  }

  return null
}

/**
 * @param {Object<string, Function>} rawMap
 * @returns {Object<string, Function>}
 */
export function buildNormalizedComponentsMap(rawMap) {
  const normalized = {}

  for (const [path, loader] of Object.entries(rawMap)) {
    normalized[path.replace(/\\/g, '/')] = loader
  }

  return normalized
}

/**
 * @param {string} componentPath
 * @param {Object<string, Function>} componentsMap
 * @returns {Function|null}
 */
export function findComponentLoader(componentPath, componentsMap) {
  const searchPath = componentPathToGlobKey(componentPath)
  if (!searchPath) {
    return null
  }

  return componentsMap[searchPath] ?? null
}

/**
 * Lazy loader: сначала glob, в dev — import по алиасу Vite (новые .vue до перезапуска).
 * @param {string} componentPath
 * @param {() => Object<string, Function>} getComponentsMap
 * @returns {() => Promise<*>}
 */
export function createDeferredComponentImport(componentPath, getComponentsMap) {
  return () => {
    const loader = findComponentLoader(componentPath, getComponentsMap())

    if (loader) {
      return loader()
    }

    if (import.meta.env.DEV && componentPath.startsWith('@/')) {
      return import(/* @vite-ignore */ componentPath)
    }

    return Promise.reject(new Error(`Component not found: ${componentPath}`))
  }
}
