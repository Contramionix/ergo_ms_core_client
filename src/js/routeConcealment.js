import { accessDeniedState } from './accessDeniedState'

/**
 * Служебный маршрут, которого «нет» для тех, кому нельзя:
 * meta.notFoundIfDenied — тот же экран 404, URL не меняется.
 *
 * Нельзя { name: 'NotFound', params: pathMatch }: catch-all снова
 * совпадёт с живым маршрутом, и служебная страница откроется.
 */
export const CONCEALED_NOT_FOUND = 'concealedNotFound'

export function routeConcealsIfDenied(to) {
  return Boolean(to?.meta?.notFoundIfDenied)
}

export function applyConcealedNotFound() {
  accessDeniedState.active = true
  accessDeniedState.variant = 'notFound'
  accessDeniedState.title = null
  accessDeniedState.message = null
}

export function isConcealedNotFoundRedirect(access) {
  return access?.redirect === CONCEALED_NOT_FOUND
}

/**
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {{ title?: string|null, message?: string|null, overlay?: boolean }} [options]
 */
export function denyRouteAccess(to, options = {}) {
  if (routeConcealsIfDenied(to)) {
    applyConcealedNotFound()
    return { allowed: false, redirect: CONCEALED_NOT_FOUND }
  }

  const { title = null, message = null, overlay = true } = options
  accessDeniedState.variant = null
  if (overlay) {
    accessDeniedState.active = true
    accessDeniedState.title = title
    accessDeniedState.message = message
  }
  return { allowed: false, redirect: 'AccessDenied' }
}