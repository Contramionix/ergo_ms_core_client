/**
 * Platform session-scope guard — проверка активного session-scope на маршрутах.
 *
 * Welcome/home — через options или session.scope_entry_routes.
 * Само понятие scope (какой claim гейтит) — за модулем-владельцем домена.
 */

import tokenService from '@/core/cms/js/tokenService'
import {
  collectScopedModuleEntryRouteNames,
  collectScopedModuleExcludedPaths,
  getScopedModuleHomeRoute,
  getScopedModuleOverviewRoute,
} from '@/integrations/sessionScopedModuleContext.js'
import {
  getSessionDefaultHomeRoute,
  getSessionScopeOnboardingPath,
  getSessionScopeWelcomeRoute,
} from '@/integrations/sessionScopeEntryRoutes.js'

/**
 * Meta с matched: у nested/redirect to.meta иногда без флагов самого глубокого record.
 */
function routeMetaIsTrue(to, key) {
  if (to?.meta?.[key] === true) {
    return true
  }
  const matched = to?.matched
  if (!Array.isArray(matched)) {
    return false
  }
  for (let i = matched.length - 1; i >= 0; i -= 1) {
    if (matched[i]?.meta?.[key] === true) {
      return true
    }
  }
  return false
}

function routeMetaEquals(to, key, value) {
  if (to?.meta?.[key] === value) {
    return true
  }
  const matched = to?.matched
  if (!Array.isArray(matched)) {
    return false
  }
  for (let i = matched.length - 1; i >= 0; i -= 1) {
    if (matched[i]?.meta?.[key] === value) {
      return true
    }
  }
  return false
}

export function routeRequiresSessionScope(to) {
  return (
    routeMetaIsTrue(to, 'requiresSessionScope')
    || routeMetaIsTrue(to, 'requiresActiveSessionScope')
  )
}

export function isSessionScopeOnboardingRoute(to) {
  const onboardingPath = getSessionScopeOnboardingPath()
  if (!onboardingPath) {
    return false
  }
  return to.path === onboardingPath
}

export function getModuleOverviewRoute(path) {
  return getScopedModuleOverviewRoute(path)
}

export function getModuleDashboard(path, fallbackRoute) {
  const fallback = fallbackRoute ?? getSessionDefaultHomeRoute('AppHome')
  return getScopedModuleHomeRoute(path, fallback)
}

export function resolvePostAuthTarget(route, { defaultHomeRoute } = {}) {
  const homeRoute = defaultHomeRoute ?? getSessionDefaultHomeRoute('AppHome')
  const redirect = route.query?.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }
  if (typeof redirect === 'string' && redirect.length > 0) {
    const dashboardByPath = getModuleDashboard(redirect, homeRoute)
    if (dashboardByPath !== homeRoute) {
      return { name: dashboardByPath }
    }
    return { name: redirect }
  }
  return { name: getModuleDashboard(route.fullPath || '', homeRoute) }
}

function buildExcludedRouteNames(extraWelcomeRoute) {
  const names = collectScopedModuleEntryRouteNames()
  if (extraWelcomeRoute) {
    names.add(extraWelcomeRoute)
  }
  return names
}

function isExcludedRoute(to, welcomeRoute) {
  if (collectScopedModuleExcludedPaths().has(to.path)) {
    return true
  }
  if (to.name && buildExcludedRouteNames(welcomeRoute).has(to.name)) {
    return true
  }
  return false
}

function allowsEmptyStateWithoutSessionScope(to) {
  if (!routeMetaEquals(to, 'sessionScopeBlockedFallback', 'empty-state')) {
    return false
  }
  return routeRequiresSessionScope(to)
}

function redirectToWelcome(next, fullPath, welcomeRoute) {
  return next({
    name: welcomeRoute,
    query: { redirect: fullPath },
  })
}

function redirectToModuleOverview(next, to, welcomeRoute) {
  const overviewRoute = getModuleOverviewRoute(to.path)
  if (overviewRoute && to.name !== overviewRoute) {
    return next({
      name: overviewRoute,
      query: { redirect: to.fullPath },
    })
  }
  return redirectToWelcome(next, to.fullPath, welcomeRoute)
}

/**
 * @param {object} [options]
 * @param {string} [options.welcomeRoute] — маршрут welcome; по умолчанию из session.scope_entry_routes
 * @param {string} [options.defaultHomeRoute] — fallback home
 */
export async function runSessionScopeGuard(to, from, next, options = {}) {
  const welcomeRoute = options.welcomeRoute ?? getSessionScopeWelcomeRoute('AppHome')
  const defaultHomeRoute = options.defaultHomeRoute ?? getSessionDefaultHomeRoute('AppHome')
  const hasActiveScope = tokenService.hasActiveSessionScope()

  if (isExcludedRoute(to, welcomeRoute) && hasActiveScope) {
    const redirectPath = to.query?.redirect
    if (redirectPath && typeof redirectPath === 'string' && redirectPath.startsWith('/')) {
      return next(redirectPath)
    }
    const dashboardRoute = getModuleDashboard(from.path || to.path, defaultHomeRoute)
    return next({ name: dashboardRoute })
  }

  if (isExcludedRoute(to, welcomeRoute)) {
    return next()
  }

  if (!routeRequiresSessionScope(to)) {
    return next()
  }

  if (!hasActiveScope) {
    if (isSessionScopeOnboardingRoute(to)) {
      return next()
    }
    // empty-state: остаёмся на запрошенной вкладке (вход без ухода на overview)
    if (allowsEmptyStateWithoutSessionScope(to)) {
      return next()
    }
    if (getModuleOverviewRoute(to.path)) {
      return redirectToModuleOverview(next, to, welcomeRoute)
    }
    return redirectToWelcome(next, to.fullPath, welcomeRoute)
  }

  return next()
}
