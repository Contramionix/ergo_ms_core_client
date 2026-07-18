import { ref } from 'vue'

import axios from 'axios'

import { resolveApiClientBaseUrl } from '@/js/api/baseUrl.js'
import {
  MAINTENANCE_POLL_INTERVAL_MS,
  normalizeMaintenancePollIntervalMs,
} from '@/js/maintenanceConfig.js'

const STATIC_STATUS_URL = '/maintenance.json'
const DEFAULT_DETAIL = 'Система временно недоступна. Мы проводим обновление и скоро вернёмся.'
const BROADCAST_CHANNEL_NAME = 'ergo-maintenance'
/** В покое (OFF) не дёргать статус чаще этого интервала. */
const IDLE_EVENT_CHECK_MIN_INTERVAL_MS = 30000

const maintenanceActive = ref(false)
const maintenanceDetail = ref(DEFAULT_DETAIL)
let checkPromise = null
let pollTimer = null
let pollIntervalMs = MAINTENANCE_POLL_INTERVAL_MS
let watchersAttached = false
/** Пользователь явно вызвал stop — не перезапускать опрос из applyMaintenanceFromResponse. */
let watchingStoppedByCaller = false
let broadcastChannel = null
/** Не зацикливать BroadcastChannel при локальном apply. */
let applyingFromBroadcast = false
let lastEventCheckAt = 0

function applyDetail(detail) {
  if (typeof detail === 'string' && detail.trim()) {
    maintenanceDetail.value = detail.trim()
  }
}

function applyPollIntervalFromPayload(payload) {
  const nextInterval = normalizeMaintenancePollIntervalMs(payload?.pollIntervalMs, pollIntervalMs)
  if (nextInterval === pollIntervalMs) {
    return
  }
  pollIntervalMs = nextInterval
  if (pollTimer !== null) {
    restartActivePollingTimer()
  }
}

function buildApiStatusUrl() {
  return `${resolveApiClientBaseUrl()}system/maintenance-status/`
}

export function isMaintenanceResponse(errorOrResponse) {
  const response = errorOrResponse?.response ?? errorOrResponse
  if (!response || response.status !== 503) {
    return false
  }
  const header = response.headers?.['x-maintenance-mode']
  if (header === '1' || header === 1) {
    return true
  }
  return response.data?.code === 'maintenance'
}

function handleMaintenanceTransition(wasActive, enabled) {
  if (enabled === wasActive || typeof window === 'undefined') {
    return
  }
  // Включение — плавный оверлей в Vue; выключение — полная перезагрузка для чистого состояния приложения.
  if (wasActive && !enabled) {
    window.location.reload()
  }
}

function syncActivePolling(enabled) {
  if (watchingStoppedByCaller) {
    return
  }
  if (enabled) {
    startActivePolling()
  } else {
    stopActivePolling()
  }
}

function publishMaintenanceBroadcast(payload) {
  if (applyingFromBroadcast || typeof BroadcastChannel === 'undefined') {
    return
  }
  try {
    if (!broadcastChannel) {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    }
    broadcastChannel.postMessage({
      maintenance: Boolean(payload?.maintenance),
      detail: payload?.detail,
      pollIntervalMs: payload?.pollIntervalMs ?? pollIntervalMs,
    })
  } catch {
    // BroadcastChannel недоступен — игнор
  }
}

function applyMaintenanceState(payload, { reloadOnChange = true, fromBroadcast = false } = {}) {
  const enabled = Boolean(payload?.maintenance)
  const wasActive = maintenanceActive.value

  applyPollIntervalFromPayload(payload)
  if (enabled) {
    applyDetail(payload?.detail)
  }

  maintenanceActive.value = enabled
  syncActivePolling(enabled)

  if (!fromBroadcast) {
    publishMaintenanceBroadcast({
      maintenance: enabled,
      detail: maintenanceDetail.value,
      pollIntervalMs,
    })
  }

  if (reloadOnChange) {
    handleMaintenanceTransition(wasActive, enabled)
  }
  return enabled
}

export function applyMaintenanceFromResponse(response) {
  if (!isMaintenanceResponse(response)) {
    return false
  }

  applyDetail(response.data?.detail)
  const wasActive = maintenanceActive.value
  maintenanceActive.value = true
  // 503 включил оверлей — опрашиваем только пока ON, чтобы поймать maintenance-off.
  syncActivePolling(true)
  if (!wasActive) {
    publishMaintenanceBroadcast({
      maintenance: true,
      detail: maintenanceDetail.value,
      pollIntervalMs,
    })
  }
  return true
}

export function clearMaintenanceMode() {
  maintenanceActive.value = false
  stopActivePolling()
}

/**
 * @returns {{ ok: true, data: object } | { ok: false, missing: boolean }}
 */
async function fetchStaticMaintenanceStatus() {
  // ergoms maintenance-on/off пишет public/ и dist/; Vite и nginx отдают /maintenance.json.
  try {
    const response = await axios.get(STATIC_STATUS_URL, {
      headers: { Accept: 'application/json' },
      params: { _: Date.now() },
      validateStatus: (status) => status === 200 || status === 404,
    })
    if (response.status === 404) {
      return { ok: false, missing: true }
    }
    return { ok: true, data: response.data }
  } catch {
    return { ok: false, missing: false }
  }
}

async function fetchApiMaintenanceStatus() {
  try {
    const response = await axios.get(buildApiStatusUrl(), {
      withCredentials: true,
      headers: { Accept: 'application/json' },
      timeout: 5000,
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 503 || status === 404,
    })
    if (response.status === 404) {
      return null
    }
    if (applyMaintenanceFromResponse(response)) {
      return { maintenance: true, detail: maintenanceDetail.value }
    }
    return response.data
  } catch (error) {
    if (applyMaintenanceFromResponse(error)) {
      return { maintenance: true, detail: maintenanceDetail.value }
    }
    return null
  }
}

export async function checkMaintenanceStatus({ reloadOnChange = true } = {}) {
  if (checkPromise) {
    return checkPromise
  }

  checkPromise = (async () => {
    const staticResult = await fetchStaticMaintenanceStatus()
    if (staticResult.ok) {
      return applyMaintenanceState(staticResult.data, { reloadOnChange })
    }
    // Нет файла — режим OFF (не долбим API ради 404). Сеть упала — запасной API.
    if (staticResult.missing) {
      return applyMaintenanceState({ maintenance: false }, { reloadOnChange })
    }

    const apiStatus = await fetchApiMaintenanceStatus()
    if (apiStatus !== null) {
      return applyMaintenanceState(apiStatus, { reloadOnChange })
    }

    return maintenanceActive.value
  })().finally(() => {
    checkPromise = null
  })

  return checkPromise
}

function requestEventCheck() {
  const now = Date.now()
  const minInterval = maintenanceActive.value
    ? pollIntervalMs
    : IDLE_EVENT_CHECK_MIN_INTERVAL_MS
  if (now - lastEventCheckAt < minInterval) {
    return
  }
  lastEventCheckAt = now
  void checkMaintenanceStatus({ reloadOnChange: true })
}

function onDocumentVisibilityChange() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
    return
  }
  requestEventCheck()
}

function onBroadcastMessage(event) {
  const payload = event?.data
  if (!payload || typeof payload !== 'object') {
    return
  }
  applyingFromBroadcast = true
  try {
    applyMaintenanceState(payload, { reloadOnChange: true, fromBroadcast: true })
  } finally {
    applyingFromBroadcast = false
  }
}

function attachWatchers() {
  if (watchersAttached || typeof window === 'undefined') {
    return
  }
  document.addEventListener('visibilitychange', onDocumentVisibilityChange)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      broadcastChannel.addEventListener('message', onBroadcastMessage)
    } catch {
      broadcastChannel = null
    }
  }
  watchersAttached = true
}

function detachWatchers() {
  if (!watchersAttached || typeof window === 'undefined') {
    return
  }
  document.removeEventListener('visibilitychange', onDocumentVisibilityChange)
  if (broadcastChannel) {
    try {
      broadcastChannel.removeEventListener('message', onBroadcastMessage)
      broadcastChannel.close()
    } catch {
      // ignore
    }
    broadcastChannel = null
  }
  watchersAttached = false
}

function restartActivePollingTimer() {
  if (pollTimer === null || typeof window === 'undefined') {
    return
  }
  window.clearInterval(pollTimer)
  pollTimer = window.setInterval(() => {
    void checkMaintenanceStatus({ reloadOnChange: true })
  }, pollIntervalMs)
}

function startActivePolling() {
  if (typeof window === 'undefined' || watchingStoppedByCaller) {
    return
  }
  if (pollTimer !== null) {
    restartActivePollingTimer()
    return
  }
  pollTimer = window.setInterval(() => {
    void checkMaintenanceStatus({ reloadOnChange: true })
  }, pollIntervalMs)
}

function stopActivePolling() {
  if (pollTimer === null || typeof window === 'undefined') {
    return
  }
  window.clearInterval(pollTimer)
  pollTimer = null
}

/**
 * Событийный режим: visibility + BroadcastChannel между вкладками.
 * Интервал /maintenance.json — только пока maintenance уже ON (ожидание off).
 */
export function startMaintenancePolling() {
  watchingStoppedByCaller = false
  attachWatchers()
  if (maintenanceActive.value) {
    startActivePolling()
  } else {
    stopActivePolling()
  }
}

export function stopMaintenancePolling() {
  watchingStoppedByCaller = true
  detachWatchers()
  stopActivePolling()
}

export function useMaintenanceMode() {
  return {
    maintenanceActive,
    maintenanceDetail,
    checkMaintenanceStatus,
    applyMaintenanceFromResponse,
    clearMaintenanceMode,
    startMaintenancePolling,
    stopMaintenancePolling,
  }
}
