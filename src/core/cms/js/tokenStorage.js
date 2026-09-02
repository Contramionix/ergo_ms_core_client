import { ref } from 'vue'
import Cookies from 'js-cookie'
import { getSessionScopeGatingClaims } from '@/integrations/sessionScopeGating.js'

const SESSION_HINT_COOKIE_NAME = 'ergo_session'

/**
 * Хранение access-токена в памяти процесса (не в cookie/localStorage).
 * Refresh-токен — только в HttpOnly cookie, выставляется сервером.
 */

export function decodePayload(token) {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ref, а не обычная переменная: computed на claim из токена должны
// пересчитываться при смене access (вход/выход из session-scope),
// иначе значение кэшируется навсегда.
const _accessToken = ref(null)

export function isExpired(token, skewSeconds = 0) {
  const payload = decodePayload(token)
  if (!payload || !payload.exp) return true
  const nowSec = Math.floor(Date.now() / 1000)
  return nowSec >= (payload.exp - skewSeconds)
}

export function getAccess() {
  return _accessToken.value || null
}

function sessionScopeSnapshot() {
  const claims = getSessionScopeGatingClaims()
  if (claims.length === 0) {
    return ''
  }
  return claims.map((name) => `${name}:${getSessionClaim(name) ?? ''}`).join('|')
}

function notifyIfSessionScopeChanged(previous) {
  // Меню session-scope пунктов собирается с API. Без события боковая панель
  // остаётся со старым деревом до F5 (вход в компанию, выход, login со scope).
  if (sessionScopeSnapshot() === previous) {
    return
  }
  if (typeof window === 'undefined') {
    return
  }
  // После setTokens вызывающий код ещё кладёт cookie/store; меню грузим на следующем тике.
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent('session-scope-changed'))
  })
}

function notifyAccessTokenChanged() {
  if (typeof window === 'undefined') {
    return
  }
  // AppsMenu / виджеты: после refresh токена пункты bridge уже есть, а кнопка
  // остаётся скрытой, если первая сборка попала в окно без access.
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent('access-token-changed'))
  })
}

export function setTokens(access) {
  if (!access) {
    return
  }
  const previous = sessionScopeSnapshot()
  _accessToken.value = access
  notifyAccessTokenChanged()
  notifyIfSessionScopeChanged(previous)
}

/** Подсказка от сервера: есть HttpOnly refresh (без секретов в JS). */
export function hasSessionHintCookie() {
  return Cookies.get(SESSION_HINT_COOKIE_NAME) === '1'
}

export function clearSessionHintCookie() {
  try {
    Cookies.remove(SESSION_HINT_COOKIE_NAME, { path: '/' })
  } catch {
    // ignore
  }
}

export function clearTokens() {
  const previous = sessionScopeSnapshot()
  _accessToken.value = null
  clearSessionHintCookie()
  notifyAccessTokenChanged()
  notifyIfSessionScopeChanged(previous)
}

export function shouldRefresh(thresholdSeconds = 120) {
  const access = getAccess()
  if (!access) return false
  const payload = decodePayload(access)
  if (!payload?.exp) return true
  const nowSec = Math.floor(Date.now() / 1000)
  return payload.exp - nowSec <= thresholdSeconds
}

/**
 * Generic-чтение session-claim из payload JWT.
 * Имена claim задаёт модуль через контракт session_context.claims.
 */
export function getSessionClaim(name) {
  if (!name) return null
  const access = getAccess()
  if (!access) return null
  const payload = decodePayload(access)
  return payload?.[name] ?? null
}

/**
 * user_id из access JWT (SimpleJWT USER_ID_CLAIM), или null.
 */
export function getUserId() {
  const value = getSessionClaim('user_id')
  if (value == null || value === '') {
    return null
  }
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : value
}

/**
 * Активен ли session-scope: в payload присутствуют все gating-claim,
 * зарегистрированные модулем-владельцем домена (session.scope_gating_claim).
 * Без зарегистрированных claim понятие scope отсутствует -> false.
 */
export function hasActiveSessionScope() {
  const claims = getSessionScopeGatingClaims()
  if (claims.length === 0) {
    return false
  }
  return claims.every((claim) => getSessionClaim(claim) !== null)
}
