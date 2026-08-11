import { ref } from 'vue'

export const rateLimitActive = ref(false)
export const retryAfterSeconds = ref(0)
export const rateLimitRetrying = ref(false)

let countdownTimer = null
let rateLimitRetryInProgress = false

const AUTH_PATH_PARTS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/start-page',
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

export function markRateLimitRetryStarted() {
  rateLimitRetryInProgress = true
  rateLimitRetrying.value = true
  rateLimitActive.value = true
}

export function markRateLimitRetryFinished() {
  rateLimitRetryInProgress = false
  rateLimitRetrying.value = false
}

/** Пока идёт «Повторить» — не пускать авто-logout на логин. */
export function isRateLimitRetryInProgress() {
  return rateLimitRetryInProgress
}

export function isRateLimitActive() {
  return rateLimitActive.value || rateLimitRetryInProgress
}

export function shouldSuppressRateLimitToast() {
  return rateLimitActive.value || isAuthLocation()
}
