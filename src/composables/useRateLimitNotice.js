import { ref } from 'vue'

const rateLimitActive = ref(false)
const retryAfterSeconds = ref(0)
const rateLimitRetrying = ref(false)

let countdownTimer = null
let rateLimitRetryInProgress = false

const AUTH_PATH_PARTS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/start-page',
]

const SILENT_URL_PARTS = [
  'logout',
  'client-log',
  'client-monitor',
  'token-refresh',
  'maintenance-status',
  'presence',
]

function clearCountdown() {
  if (countdownTimer != null) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

export function isAuthLocation(pathname = '') {
  const path = pathname || (typeof window !== 'undefined' ? window.location.pathname : '') || ''
  return AUTH_PATH_PARTS.some((part) => path.includes(part))
}

export function isRateLimitResponse(errorOrResponse) {
  const response = errorOrResponse?.response ?? errorOrResponse
  return response?.status === 429
}

export function parseRetryAfterSeconds(errorOrResponse) {
  const response = errorOrResponse?.response ?? errorOrResponse
  const headers = response?.headers
  let raw
  if (headers && typeof headers.get === 'function') {
    raw = headers.get('Retry-After') || headers.get('retry-after')
  } else {
    raw = headers?.['retry-after'] ?? headers?.['Retry-After']
  }
  if (raw == null || raw === '') {
    return 0
  }
  const trimmed = String(raw).trim()
  const asInt = Number.parseInt(trimmed, 10)
  if (Number.isFinite(asInt) && String(asInt) === trimmed) {
    return Math.max(asInt, 0)
  }
  const asDate = Date.parse(trimmed)
  if (Number.isFinite(asDate)) {
    return Math.max(Math.ceil((asDate - Date.now()) / 1000), 0)
  }
  return 0
}

function isSilentRateLimitUrl(error) {
  const url = String(error?.config?.url || error?.request?.responseURL || '')
  return SILENT_URL_PARTS.some((part) => url.includes(part))
}

function startCountdown(seconds) {
  clearCountdown()
  retryAfterSeconds.value = Math.max(Number(seconds) || 0, 0)
  if (retryAfterSeconds.value <= 0) {
    return
  }
  countdownTimer = setInterval(() => {
    if (retryAfterSeconds.value <= 1) {
      // Только разблокируем кнопку — без авто-retry (иначе мигание оверлея).
      clearCountdown()
      retryAfterSeconds.value = 0
      return
    }
    retryAfterSeconds.value -= 1
  }, 1000)
}

export function showRateLimitNotice(retryAfter = 0) {
  rateLimitActive.value = true
  const seconds = Math.max(Number(retryAfter) || 0, 0)
  // Уже на оверлее: обновить таймер на месте, не «сбрасывать» UI.
  if (seconds > 0 || retryAfterSeconds.value <= 0) {
    startCountdown(seconds)
  }
}

export function dismissRateLimitNotice() {
  clearCountdown()
  rateLimitActive.value = false
  retryAfterSeconds.value = 0
  rateLimitRetrying.value = false
}

/** Пока идёт «Повторить» — не пускать авто-logout на логин. */
export function isRateLimitRetryInProgress() {
  return rateLimitRetryInProgress
}

async function probeApiAvailable() {
  const { resolveApiClientBaseUrl } = await import('@/js/api/baseUrl.js')
  const axios = (await import('axios')).default
  const { getAccess } = await import('@/core/cms/js/tokenStorage.js')
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
  if (rateLimitRetryInProgress) {
    return
  }
  if (retryAfterSeconds.value > 0) {
    return
  }

  rateLimitRetryInProgress = true
  rateLimitRetrying.value = true
  rateLimitActive.value = true

  try {
    const { retrySessionAfterRateLimit } = await import('@/core/cms/js/tokenRefresh.js')
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
    rateLimitRetryInProgress = false
    rateLimitRetrying.value = false
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

export function isRateLimitActive() {
  return rateLimitActive.value || rateLimitRetryInProgress
}

export function shouldSuppressRateLimitToast() {
  return rateLimitActive.value || isAuthLocation()
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
