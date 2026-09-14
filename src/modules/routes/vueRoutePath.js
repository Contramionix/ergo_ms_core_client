/**
 * Сопоставление pathname с path из таблицы Vue Router.
 * Catch-all не считается попаданием: иначе любой адрес «уже есть» в оболочке.
 */

export function isCatchAllRoutePath(routePath) {
  return typeof routePath === 'string' && routePath.includes(':pathMatch(.*)')
}

export function vueRoutePathMatches(routePath, pathname) {
  if (typeof routePath !== 'string' || !routePath || typeof pathname !== 'string') {
    return false
  }
  if (isCatchAllRoutePath(routePath)) {
    return false
  }
  const path = stripTrailingSlash(pathname)
  const pattern = stripTrailingSlash(routePath)
  if (pattern === path) {
    return true
  }
  if (!routePath.includes(':') && !routePath.includes('*')) {
    return false
  }
  try {
    const matcher = vuePathToRegExp(routePath)
    return matcher.test(pathname) || matcher.test(path)
  } catch {
    return false
  }
}

/**
 * @param {Array<{ path?: string, children?: unknown }>} routes
 * @param {string} pathname
 */
export function routesCoverPath(routes, pathname) {
  if (!Array.isArray(routes) || !pathname) {
    return false
  }
  return routes.some((route) => routeConfigCoversPath(route, pathname, ''))
}

/**
 * @param {Record<string, { path?: string, children?: unknown }>} routeMap
 * @param {string} pathname
 */
export function routeMapCoversPath(routeMap, pathname) {
  if (!routeMap || typeof routeMap !== 'object' || !pathname) {
    return false
  }
  return Object.values(routeMap).some((config) => routeConfigCoversPath(config, pathname, ''))
}

function stripTrailingSlash(value) {
  if (value === '/') {
    return '/'
  }
  return value.replace(/\/+$/, '') || '/'
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function vuePathToRegExp(routePath) {
  const body = routePath.split('/').map((segment) => {
    if (segment === '') {
      return ''
    }
    if (segment === '*') {
      return '.*'
    }
    if (!segment.startsWith(':')) {
      return escapeRegExp(segment)
    }
    const optional = segment.endsWith('?')
    const raw = optional ? segment.slice(0, -1) : segment
    const custom = raw.match(/^:([^(/]+)(\(.+\))$/)
    const inner = custom ? custom[2] : '[^/]+'
    return optional ? `(?:${inner})?` : inner
  }).join('\\/')
  return new RegExp(`^${body}/?$`)
}

function joinRoutePath(parent, child) {
  if (!parent) {
    return child.startsWith('/') ? child : `/${child}`
  }
  if (!child) {
    return parent
  }
  return `${parent.replace(/\/+$/, '')}/${child.replace(/^\/+/, '')}`
}

function normalizeChildren(children) {
  if (!children) {
    return []
  }
  if (Array.isArray(children)) {
    return children
  }
  if (typeof children === 'object') {
    return Object.entries(children).map(([name, child]) => ({
      name,
      ...(child && typeof child === 'object' ? child : {}),
    }))
  }
  return []
}

function routeConfigCoversPath(config, pathname, parentPath) {
  if (!config || typeof config !== 'object') {
    return false
  }
  const rawPath = typeof config.path === 'string' ? config.path : ''
  const absPath = rawPath.startsWith('/')
    ? rawPath
    : joinRoutePath(parentPath, rawPath)
  if (absPath && vueRoutePathMatches(absPath, pathname)) {
    return true
  }
  const nextParent = absPath || parentPath
  return normalizeChildren(config.children).some((child) => (
    routeConfigCoversPath(child, pathname, nextParent)
  ))
}
