import Cookies from 'js-cookie'

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

let _accessToken = null

export function isExpired(token, skewSeconds = 0) {
  const payload = decodePayload(token)
  if (!payload || !payload.exp) return true
  const nowSec = Math.floor(Date.now() / 1000)
  return nowSec >= (payload.exp - skewSeconds)
}

export function getAccess() {
  return _accessToken || null
}

/** @deprecated Refresh доступен только через HttpOnly cookie на сервере */
export function getRefresh() {
  return null
}

export function getAccessExp() {
  const token = getAccess()
  const payload = token ? decodePayload(token) : null
  return payload?.exp ? payload.exp * 1000 : 0
}

export function setTokens(access, _refreshIgnored = null) {
  if (access) {
    _accessToken = access
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

export function hasLegacyRefreshCookie() {
  return Boolean(Cookies.get('refresh'))
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

let _uiSettingsReset = null

export function registerUiSettingsReset(callback) {
  _uiSettingsReset = callback
}

export function clearTokens() {
  _accessToken = null
  clearLegacyAuthCookies()
  clearSessionHintCookie()

  try {
    localStorage.removeItem('crm_active_organization')
    localStorage.removeItem('lms_active_organization_id')
  } catch {
    // ignore
  }

  _uiSettingsReset?.()
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

export function getOrganizationId() {
  const access = getAccess()
  if (!access) return null
  const payload = decodePayload(access)
  return payload?.organization_id ?? null
}

export function getDepartmentId() {
  const access = getAccess()
  if (!access) return null
  const payload = decodePayload(access)
  return payload?.department_id ?? null
}

export function hasActiveOrganization() {
  return getOrganizationId() !== null
}

export function getPayload() {
  const access = getAccess()
  if (!access) return null
  return decodePayload(access)
}

export function hasAccessToken() {
  return Boolean(_accessToken)
}
