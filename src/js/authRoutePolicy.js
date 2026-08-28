import tokenService from '@/core/cms/js/tokenService'
import { isExpired } from '@/core/cms/js/tokenStorage.js'
import { wasLastRefreshTransient } from '@/core/cms/js/tokenRefresh.js'
import { isRateLimitActive } from '@/composables/useRateLimitNotice.js'

function matchedMetaIsTrue(to, key) {
  if (to?.meta?.[key] === true) {
    return true
  }
  const matched = to?.matched
  if (!Array.isArray(matched)) {
    return false
  }
  return matched.some((record) => record?.meta?.[key] === true)
}

/** Страницы входа, регистрации и явно публичные — без сессии. */
export function isAnonymousRoute(to) {
  if (!to) {
    return false
  }
  if (to.name === 'logout' || to.name === 'Login' || to.name === 'StartPage') {
    return true
  }
  return matchedMetaIsTrue(to, 'startRoute') || matchedMetaIsTrue(to, 'public')
}

/**
 * Оболочка приложения только для вошедших.
 * Если у маршрута забыли requiresAuth — всё равно требуем сессию.
 */
export function routeNeedsAuth(to) {
  if (isAnonymousRoute(to)) {
    return false
  }
  if (to?.meta?.requiresAuth === false) {
    return false
  }
  return true
}

/**
 * Оставить защищённый маршрут только если access ещё в памяти
 * и refresh временно недоступен (429 / мигание API).
 * Гость без токена на оболочку не остаётся.
 */
export function shouldKeepUnverifiedSession() {
  const access = tokenService.getAccess()
  if (!access || isExpired(access)) {
    return false
  }
  return wasLastRefreshTransient() || isRateLimitActive()
}
