export const NOT_FOUND_ROUTE_NAME = 'NotFound'

export function normalizeMenuRoutePath(path) {
  if (!path) return ''
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

export function isSameMenuRoutePath(left, right) {
  return normalizeMenuRoutePath(left) === normalizeMenuRoutePath(right)
}

export function canNavigateToRoute(router, routeName) {
  return Boolean(routeName && router.hasRoute(routeName))
}

export function safeNavigateByName(router, routeName) {
  if (!routeName) {
    return Promise.resolve()
  }

  if (canNavigateToRoute(router, routeName)) {
    return router.push({ name: routeName })
  }
  return router.push({ name: NOT_FOUND_ROUTE_NAME })
}
