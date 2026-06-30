import axios from 'axios'
import Cookies from 'js-cookie'

import { resolveApiClientBaseUrl } from '@/js/api/baseUrl.js'
import { clearLegacyAuthCookies, setTokens } from '@/core/cms/js/tokenStorage.js'

const AUTH_REFRESH_PATH = 'cms/adp/token-refresh/'
const AUTH_LOGOUT_PATH = 'cms/adp/logout/'

let refreshInProgress = null

/** Legacy refresh из js-cookie (до перехода на HttpOnly) — только для миграции сессии. */
function getLegacyRefreshPayload() {
  const legacyRefresh = Cookies.get('refresh')
  return legacyRefresh ? { refresh: legacyRefresh } : {}
}

/**
 * Обновляет access-токен через SimpleJWT без apiClient (разрыв цикла tokenService ↔ manager).
 * Refresh читается сервером из HttpOnly cookie (или из body при миграции legacy-сессии).
 */
export async function performTokenRefresh() {
  if (refreshInProgress) return refreshInProgress

  refreshInProgress = (async () => {
    try {
      const { data } = await axios.post(
        `${resolveApiClientBaseUrl()}${AUTH_REFRESH_PATH}`,
        getLegacyRefreshPayload(),
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        },
      )

      const newAccess = data?.access ?? data?.data?.access
      if (!newAccess) {
        throw new Error('Refresh failed')
      }

      setTokens(newAccess)
      clearLegacyAuthCookies()
      return newAccess
    } finally {
      refreshInProgress = null
    }
  })()

  return refreshInProgress
}

export async function performServerLogout() {
  try {
    await axios.post(
      `${resolveApiClientBaseUrl()}${AUTH_LOGOUT_PATH}`,
      {},
      { withCredentials: true },
    )
  } catch {
    // ignore — локальная очистка всё равно выполняется
  }
}
