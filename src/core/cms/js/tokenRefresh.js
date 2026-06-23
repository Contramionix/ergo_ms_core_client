import axios from 'axios'

import { resolveApiClientBaseUrl } from '@/js/api/baseUrl.js'
import { getRefresh, isExpired, setTokens } from '@/core/cms/js/tokenStorage.js'

const AUTH_REFRESH_PATH = 'cms/adp/token-refresh/'

let refreshInProgress = null

/**
 * Обновляет access-токен через SimpleJWT без apiClient (разрыв цикла tokenService ↔ manager).
 */
export async function performTokenRefresh() {
  if (refreshInProgress) return refreshInProgress

  const refresh = getRefresh()
  if (!refresh || isExpired(refresh, 0)) {
    return Promise.reject(new Error('Refresh token missing or expired'))
  }

  refreshInProgress = (async () => {
    try {
      const { data } = await axios.post(
        `${resolveApiClientBaseUrl()}${AUTH_REFRESH_PATH}`,
        { refresh },
        { headers: { 'Content-Type': 'application/json' } },
      )

      const newAccess = data?.access ?? data?.data?.access
      if (!newAccess) {
        throw new Error('Refresh failed')
      }

      setTokens(newAccess, refresh)
      return newAccess
    } finally {
      refreshInProgress = null
    }
  })()

  return refreshInProgress
}
