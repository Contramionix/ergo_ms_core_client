import axios from 'axios'

import { retrySessionAfterRateLimit } from '@/core/cms/js/tokenRefresh.js'
import { getAccess } from '@/core/cms/js/tokenStorage.js'
import { resolveApiClientBaseUrl } from '@/js/api/baseUrl.js'

import {
  dismissRateLimitNotice,
  isAuthLocation,
  isRateLimitActive,
  isRateLimitResponse,
  isRateLimitRetryInProgress,
  markRateLimitRetryFinished,
  markRateLimitRetryStarted,
  parseRetryAfterSeconds,
  rateLimitActive,
  rateLimitRetrying,
  retryAfterSeconds,
  shouldSuppressRateLimitToast,
  showRateLimitNotice,
} from '@/composables/rateLimitNoticeState.js'

export {
  dismissRateLimitNotice,
  isAuthLocation,
  isRateLimitActive,
  isRateLimitResponse,
  isRateLimitRetryInProgress,
  parseRetryAfterSeconds,
  shouldSuppressRateLimitToast,
  showRateLimitNotice,
}

const SILENT_URL_PARTS = [
  'logout',
  'client-log',
  'client-monitor',
  'token-refresh',
  'maintenance-status',
  'presence',
]

function isSilentRateLimitUrl(error) {
  const url = String(error?.config?.url || error?.request?.responseURL || '')
  return SILENT_URL_PARTS.some((part) => url.includes(part))
}

async function probeApiAvailable() {
  const headers = { 'Content-Type': 'application/json' }
  const access = getAccess()
  if (access) {
    headers.Authorization = `Bearer ${access}`
  }
  const response = await axios.get(
    `${resolveApiClientBaseUrl()}cms/adp/session-bootstrap/`,
    {
      headers,
      withCredentials: true,
      validateStatus: (status) => status === 200 || status === 401 || status === 429,
    },
  )
  if (response.status === 429) {
    return { ok: false, rateLimited: true, retryAfter: parseRetryAfterSeconds(response) }
  }
  // 200 — ок; 401 с живым hint обработает обычный auth, это не «ещё лимит».
  return { ok: true, rateLimited: false, retryAfter: 0 }
}

/**
 * Кнопка «Повторить»: оверлей не снимаем, пока API снова не ответит нормально.
 * Без reload «на удачу» — иначе мигает страница под оверлеем.
 */
export async function retryRateLimitNotice() {
  if (isRateLimitRetryInProgress()) {
    return
  }
  if (retryAfterSeconds.value > 0) {
    return
  }

  markRateLimitRetryStarted()

  try {
    const result = await retrySessionAfterRateLimit()

    if (result === 'rate_limited') {
      if (!rateLimitActive.value) {
        showRateLimitNotice(0)
      }
      return
    }

    if (result === 'gone') {
      dismissRateLimitNotice()
      return
    }

    // Сессия есть — проверяем, что API уже принимает запросы.
    const probe = await probeApiAvailable()
    if (probe.rateLimited) {
      showRateLimitNotice(probe.retryAfter || 0)
      return
    }

    const { showBootstrapMask } = await import('@/js/bootstrapMask.js')
    showBootstrapMask()
    dismissRateLimitNotice()
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload()
    }
  } catch {
    showRateLimitNotice(retryAfterSeconds.value > 0 ? retryAfterSeconds.value : 0)
  } finally {
    markRateLimitRetryFinished()
  }
}

export function shouldIgnoreRateLimitOverlay(error) {
  // Фоновые URL — без оверлея; страницы логина НЕ глушим.
  return isSilentRateLimitUrl(error)
}

export function applyRateLimitFromResponse(error) {
  if (!isRateLimitResponse(error)) {
    return false
  }
  if (shouldIgnoreRateLimitOverlay(error)) {
    return false
  }
  showRateLimitNotice(parseRetryAfterSeconds(error))
  return true
}

export function useRateLimitNotice() {
  return {
    rateLimitActive,
    retryAfterSeconds,
    rateLimitRetrying,
    dismissRateLimitNotice,
    retryRateLimitNotice,
  }
}
