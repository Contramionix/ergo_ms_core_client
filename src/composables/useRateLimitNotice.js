import { ref } from 'vue'

const rateLimitActive = ref(false)
const retryAfterSeconds = ref(0)

let countdownTimer = null

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
      dismissRateLimitNotice()
      return
    }
    retryAfterSeconds.value -= 1
  }, 1000)
}

export function showRateLimitNotice(retryAfter = 0) {
  rateLimitActive.value = true
  startCountdown(retryAfter)
}

export function dismissRateLimitNotice() {
  clearCountdown()
  rateLimitActive.value = false
  retryAfterSeconds.value = 0
}

export function shouldIgnoreRateLimitOverlay(error) {
  if (isSilentRateLimitUrl(error)) {
    return true
  }
  return isAuthLocation()
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

export function shouldSuppressRateLimitToast() {
  return rateLimitActive.value || isAuthLocation()
}

export function useRateLimitNotice() {
  return {
    rateLimitActive,
    retryAfterSeconds,
    dismissRateLimitNotice,
  }
}
