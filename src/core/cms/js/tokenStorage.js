import { ref } from 'vue'
import Cookies from 'js-cookie'
import bridge from '@/integrations/ModuleBridge.js'
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

export function getAccessExp() {
  const token = getAccess()
  const payload = token ? decodePayload(token) : null
  return payload?.exp ? payload.exp * 1000 : 0
}

export function setTokens(access, _refreshIgnored = null) {
  if (access) {
    _accessToken.value = access
  }
  clearLegacyAuthCookies()
}

/** Удаляет устаревшие JWT-cookie, выставленные клиентом до перехода на HttpOnly. */
export function clearLegacyAuthCookies() {
  try {
    Cookies.remove('token', { path: '/' })
    Cookies.remove('refresh', { path: '/' })
  } catch {
    // ignore
  }
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
  _accessToken.value = null
  clearLegacyAuthCookies()
  clearSessionHintCookie()

  try {
    bridge.emit('core.auth.clear_legacy_storage')
  } catch {
    // ignore
  }
}

export function shouldRefresh(thresholdSeconds = 120) {
  const access = getAccess()
  if (!access) return false
  const payload = decodePayload(access)
  if (!payload?.exp) return true
  const nowSec = Math.floor(Date.now() / 1000)
  return payload.exp - nowSec <= thresholdSeconds
}

export function getUserId() {
  const access = getAccess()
  if (!access) return null
  const payload = decodePayload(access)
  return payload?.user_id ? String(payload.user_id) : null
}

export function getSessionUserId() {
  const access = getAccess()
  if (!access || isExpired(access)) return null
  return getUserId()
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

export function getPayload() {
  const access = getAccess()
  if (!access) return null
  return decodePayload(access)
}

export function hasAccessToken() {
  return Boolean(_accessToken.value)
}
