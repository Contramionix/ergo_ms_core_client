import axios from 'axios'
import Cookies from 'js-cookie'

import { resolveApiClientBaseUrl } from '@/js/api/baseUrl.js'
import {
  clearLegacyAuthCookies,
  clearSessionHintCookie,
  getAccess,
  hasSessionHintCookie,
  hasLegacyRefreshCookie,
  isExpired,
  setTokens,
} from '@/core/cms/js/tokenStorage.js'

const AUTH_REFRESH_PATH = 'cms/adp/token-refresh/'
const AUTH_LOGOUT_PATH = 'cms/adp/logout/'

const EXPECTED_REFRESH_FAILURE = new Set([400, 401])

let refreshInProgress = null
let sessionRestorePromise = null
/** @type {boolean | null} null — ещё не проверяли, false — сессии нет, true — есть */
let sessionRestoreResolved = null

/** Legacy refresh из js-cookie (до перехода на HttpOnly) — только для миграции сессии. */
function getLegacyRefreshPayload() {
  const legacyRefresh = Cookies.get('refresh')
  return legacyRefresh ? { refresh: legacyRefresh } : {}
}

export function canAttemptTokenRefresh() {
  return hasLegacyRefreshCookie() || hasSessionHintCookie()
}

export function invalidateSessionRestoreCache() {
  sessionRestoreResolved = false
  sessionRestorePromise = null
  clearSessionHintCookie()
}

function markSessionRestoreResult(hasSession) {
  sessionRestoreResolved = hasSession
  if (!hasSession) {
    clearSessionHintCookie()
  }
}

/**
 * Однократная попытка восстановить сессию (main.js + startRoute guard).
 * Без подсказки о refresh не обращается к API — нет лишних 400 в консоли.
 */
export async function restoreSession() {
  const access = getAccess()
  if (access && !isExpired(access)) {
    markSessionRestoreResult(true)
    return true
  }

  if (sessionRestoreResolved === false) {
    return false
  }

  if (!canAttemptTokenRefresh()) {
    markSessionRestoreResult(false)
    return false
  }

  if (!sessionRestorePromise) {
    sessionRestorePromise = (async () => {
      const newAccess = await performTokenRefresh()
      const ok = Boolean(newAccess)
      markSessionRestoreResult(ok)
      return ok
    })().finally(() => {
      sessionRestorePromise = null
    })
  }

  return sessionRestorePromise
}

/**
 * Обновляет access-токен через SimpleJWT без apiClient (разрыв цикла tokenService ↔ manager).
 * @returns {Promise<string|null>} access или null при отсутствии/истечении сессии (без throw)
 */
export async function performTokenRefresh() {
  if (refreshInProgress) {
    return refreshInProgress
  }

  if (!canAttemptTokenRefresh()) {
    return null
  }

  refreshInProgress = (async () => {
    try {
      const response = await axios.post(
        `${resolveApiClientBaseUrl()}${AUTH_REFRESH_PATH}`,
        getLegacyRefreshPayload(),
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
          validateStatus: (status) =>
            status === 200 || EXPECTED_REFRESH_FAILURE.has(status),
        },
      )

      if (response.status !== 200) {
        markSessionRestoreResult(false)
        return null
      }

      const newAccess = response.data?.access ?? response.data?.data?.access
      if (!newAccess) {
        markSessionRestoreResult(false)
        return null
      }

      setTokens(newAccess)
      clearLegacyAuthCookies()
      markSessionRestoreResult(true)
      return newAccess
    } catch {
      return null
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
