/**
 * Маршруты входа в session-scoped сессию — platform-контракт ModuleBridge.
 *
 * Модуль-владелец домена регистрирует:
 *   bridge.provideMany(SESSION_SCOPE_ENTRY_ROUTES_GROUP, 'welcome', 'RouteName')
 *   bridge.provideMany(SESSION_SCOPE_ENTRY_ROUTES_GROUP, 'defaultHome', 'AppHome')
 *   bridge.provideMany(SESSION_SCOPE_ENTRY_ROUTES_GROUP, 'onboardingPath', '/path/to/onboarding')
 */

import bridge from '@/integrations/ModuleBridge.js'
import { SESSION_SCOPE_ENTRY_ROUTES_GROUP } from '@/integrations/moduleContracts.js'

export { SESSION_SCOPE_ENTRY_ROUTES_GROUP }

function _routeName(value, fallback) {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (value && typeof value.routeName === 'string' && value.routeName.length > 0) {
    return value.routeName
  }
  return fallback
}

export function getSessionScopeWelcomeRoute(fallback = 'AppHome') {
  const routes = bridge.all(SESSION_SCOPE_ENTRY_ROUTES_GROUP)
  return _routeName(routes.welcome, fallback)
}

export function getSessionDefaultHomeRoute(fallback = 'AppHome') {
  const routes = bridge.all(SESSION_SCOPE_ENTRY_ROUTES_GROUP)
  return _routeName(routes.defaultHome, fallback)
}

export function getSessionScopeOnboardingPath(fallback = null) {
  const routes = bridge.all(SESSION_SCOPE_ENTRY_ROUTES_GROUP)
  const value = routes.onboardingPath
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  return fallback
}
