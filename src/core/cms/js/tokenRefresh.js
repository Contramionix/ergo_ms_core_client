import axios from 'axios'

import { resolveApiClientBaseUrl } from '@/js/api/baseUrl.js'
import {
  clearSessionHintCookie,
  getAccess,
  hasSessionHintCookie,
  isExpired,
  setTokens,
} from '@/core/cms/js/tokenStorage.js'
import { logWarn } from '@/js/utils/logError.js'

const AUTH_REFRESH_PATH = 'cms/adp/token-refresh/'
const AUTH_LOGOUT_PATH = 'cms/adp/logout/'

const EXPECTED_REFRESH_FAILURE = new Set([400, 401])

let refreshInProgress = null
let sessionRestorePromise = null
/** @type {boolean | null} null — ещё не проверяли, false — сессии нет, true — есть */
let sessionRestoreResolved = null
/**
 * После первого logout до явного login:
 * — не слать повторные POST /logout/
 * — не делать token-refresh (иначе refresh↔logout гонка и шторм запросов)
 */
let serverLogoutPromise = null
let logoutFinalized = false
/** Payload session-bootstrap из успешного token-refresh (один RTT на F5). */
let pendingSessionBootstrap = null

/**
 * Забирает bootstrap из последнего token-refresh (если был). Повторный вызов — null.
 * @returns {object | null}
 */
export function takePendingSessionBootstrap() {
  const data = pendingSessionBootstrap
  pendingSessionBootstrap = null
  return data
}

function storePendingSessionBootstrap(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    pendingSessionBootstrap = payload
  }
}

export function canAttemptTokenRefresh() {
  if (logoutFinalized || serverLogoutPromise) {
    return false
  }
  return hasSessionHintCookie()
}

export function invalidateSessionRestoreCache() {
  sessionRestoreResolved = false
  sessionRestorePromise = null
  pendingSessionBootstrap = null
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
  if (logoutFinalized) {
    return false
  }

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
  if (logoutFinalized || serverLogoutPromise) {
    return null
  }

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
        {},
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
          validateStatus: (status) =>
            status === 200 || EXPECTED_REFRESH_FAILURE.has(status),
        },
      )

      if (logoutFinalized || serverLogoutPromise) {
        return null
      }

      if (response.status !== 200) {
        markSessionRestoreResult(false)
        return null
      }

      const newAccess = response.data?.access ?? response.data?.data?.access
      if (!newAccess) {
        markSessionRestoreResult(false)
        return null
      }

      const bootstrap =
        response.data?.session_bootstrap ?? response.data?.data?.session_bootstrap
      storePendingSessionBootstrap(bootstrap)

      setTokens(newAccess)
      markSessionRestoreResult(true)
      return newAccess
    } catch (error) {
      logWarn('[tokenRefresh] unexpected refresh failure', error)
      return null
    } finally {
      refreshInProgress = null
    }
  })()

  return refreshInProgress
}

/** Сброс только после успешного login — не из token-refresh. */
export function resetServerLogoutGate() {
  serverLogoutPromise = null
  logoutFinalized = false
}

export function isServerLogoutFinalized() {
  return logoutFinalized
}

/**
 * Один POST /logout/ на волну истечения сессии до следующего login.
 */
export async function performServerLogout() {
  if (serverLogoutPromise) {
    return serverLogoutPromise
  }

  logoutFinalized = true
  invalidateSessionRestoreCache()

  serverLogoutPromise = (async () => {
    try {
      await axios.post(
        `${resolveApiClientBaseUrl()}${AUTH_LOGOUT_PATH}`,
        {},
        {
          withCredentials: true,
          validateStatus: (status) =>
            (status >= 200 && status < 300) || status === 401 || status === 429,
        },
      )
    } catch {
      // ignore — локальная очистка всё равно выполняется вызывающим кодом
    }
  })()

  return serverLogoutPromise
}
