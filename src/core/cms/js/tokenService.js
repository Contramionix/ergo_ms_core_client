import Cookies from 'js-cookie'
import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

function decodePayload(token) {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch (e) {
    return null
  }
}

function getExpiryDate(token) {
  const payload = decodePayload(token)
  if (!payload || !payload.exp) return null
  return new Date(payload.exp * 1000)
}

function isExpired(token, skewSeconds = 0) {
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
    // fallback: сессионная cookie
    Cookies.set(name, token)
  }
}

let refreshInProgress = null

export const tokenService = {
  getAccess() {
    return Cookies.get('token') || null
  },
  getRefresh() {
    return Cookies.get('refresh') || null
  },
  getAccessExp() {
    const t = this.getAccess()
    const p = t ? decodePayload(t) : null
    return p?.exp ? p.exp * 1000 : 0
  },
  setTokens(access, refresh) {
    if (access) setCookieByExp('token', access)
    if (refresh) setCookieByExp('refresh', refresh)
  },
  clear() {
    Cookies.remove('token')
    Cookies.remove('refresh')
    Cookies.remove('userId')
    
    // Очищаем активную организацию при очистке токенов
    try {
      const STORAGE_KEY = 'crm_active_organization'
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Ошибка очистки активной организации при очистке токенов:', error)
    }
  },
  async tryRefresh() {
    if (refreshInProgress) return refreshInProgress
    const refresh = this.getRefresh()
    if (!refresh || isExpired(refresh, 0)) {
      return Promise.reject(new Error('Refresh token missing or expired'))
    }
    refreshInProgress = (async () => {
      try {
        const resp = await apiClient.post(endpoints.auth.refresh, { refresh }, false)
        if (resp?.success && resp?.data?.access) {
          const newAccess = resp.data.access
          this.setTokens(newAccess, refresh)
          return newAccess
        }
        throw new Error('Refresh failed')
      } finally {
        refreshInProgress = null
      }
    })()
    return refreshInProgress
  },
  shouldRefresh(thresholdSeconds = 120) {
    const access = this.getAccess()
    if (!access) return false
    const payload = decodePayload(access)
    if (!payload?.exp) return false
    const nowSec = Math.floor(Date.now() / 1000)
    return payload.exp - nowSec <= thresholdSeconds
  }
}

export default tokenService


