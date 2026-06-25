export const NOT_FOUND_ROUTE_NAME = 'NotFound'

export function canNavigateToRoute(router, routeName) {
  return Boolean(routeName && router.hasRoute(routeName))
}

export function safeNavigateByName(router, routeName) {
  if (canNavigateToRoute(router, routeName)) {
    return router.push({ name: routeName })
  }
  return router.push({ name: NOT_FOUND_ROUTE_NAME })
}
