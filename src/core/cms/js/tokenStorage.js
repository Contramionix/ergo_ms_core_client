import Cookies from 'js-cookie'

export function decodePayload(token) {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function getExpiryDate(token) {
  const payload = decodePayload(token)
  if (!payload || !payload.exp) return null
  return new Date(payload.exp * 1000)
}

export function isExpired(token, skewSeconds = 0) {
  const payload = decodePayload(token)
  if (!payload || !payload.exp) return true
  const nowSec = Math.floor(Date.now() / 1000)
  return nowSec >= (payload.exp - skewSeconds)
}

function setCookieByExp(name, token) {
  const expDate = getExpiryDate(token)
  if (expDate) {
    Cookies.set(name, token, { expires: expDate })
  } else {
    Cookies.set(name, token)
  }
}

export function getAccess() {
  return Cookies.get('token') || null
}

export function getRefresh() {
  return Cookies.get('refresh') || null
}

export function getAccessExp() {
  const token = getAccess()
  const payload = token ? decodePayload(token) : null
  return payload?.exp ? payload.exp * 1000 : 0
}

export function setTokens(access, refresh) {
  if (access) setCookieByExp('token', access)
  if (refresh) setCookieByExp('refresh', refresh)
}

let _uiSettingsReset = null

export function registerUiSettingsReset(callback) {
  _uiSettingsReset = callback
}

export function clearTokens() {
  Cookies.remove('token')
  Cookies.remove('refresh')

  try {
    localStorage.removeItem('crm_active_organization')
    localStorage.removeItem('_uiLastUserId')
  } catch {
    // ignore
  }

  _uiSettingsReset?.()
}

export function shouldRefresh(thresholdSeconds = 120) {
  const access = getAccess()
  if (!access) return false
  const payload = decodePayload(access)
  if (!payload?.exp) return false
  const nowSec = Math.floor(Date.now() / 1000)
  return payload.exp - nowSec <= thresholdSeconds
}

export function getUserId() {
  const access = getAccess()
  if (!access) return null
  const payload = decodePayload(access)
  return payload?.user_id ? String(payload.user_id) : null
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
