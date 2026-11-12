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

export async function safeNavigateByName(router, routeName) {
  if (!routeName) {
    return
  }

  if (!canNavigateToRoute(router, routeName)) {
    const { moduleManager } = await import('@/modules/index.js')
    if (typeof moduleManager.loadRemotesUntilRoute === 'function') {
      await moduleManager.loadRemotesUntilRoute(routeName)
      const { addPendingModuleRoutes } = await import('@/js/routers.js')
      addPendingModuleRoutes(router)
    }
  }

  if (canNavigateToRoute(router, routeName)) {
    return router.push({ name: routeName })
  }
  return router.push({ name: NOT_FOUND_ROUTE_NAME })
}
