import { ref } from 'vue'

import axios from 'axios'

import { resolveApiBaseUrl } from '@/js/api/baseUrl.js'
import {
  MAINTENANCE_POLL_INTERVAL_MS,
  normalizeMaintenancePollIntervalMs,
} from '@/js/maintenanceConfig.js'

const STATIC_STATUS_URL = '/maintenance.json'
const DEFAULT_DETAIL = 'Система временно недоступна. Мы проводим обновление и скоро вернёмся.'

const maintenanceActive = ref(false)
const maintenanceDetail = ref(DEFAULT_DETAIL)
let checkPromise = null
let pollTimer = null
let pollIntervalMs = MAINTENANCE_POLL_INTERVAL_MS
let visibilityListenerAttached = false

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
    restartMaintenancePollingTimer()
  }
}

function buildApiStatusUrl() {
  const base = resolveApiBaseUrl()
  const prefix = base ? `${base}/api/` : '/api/'
  return `${prefix}system/maintenance-status/`
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

function applyMaintenanceState(payload, { reloadOnChange = true } = {}) {
  const enabled = Boolean(payload?.maintenance)
  const wasActive = maintenanceActive.value

  applyPollIntervalFromPayload(payload)
  if (enabled) {
    applyDetail(payload?.detail)
  }

  maintenanceActive.value = enabled
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
  maintenanceActive.value = true
  return true
}

export function clearMaintenanceMode() {
  maintenanceActive.value = false
}

async function fetchStaticMaintenanceStatus() {
  try {
    const response = await axios.get(STATIC_STATUS_URL, {
      headers: { Accept: 'application/json' },
      params: { _: Date.now() },
      validateStatus: (status) => status === 200,
    })
    return response.data
  } catch {
    return null
  }
}

async function fetchApiMaintenanceStatus() {
  try {
    const response = await axios.get(buildApiStatusUrl(), {
      withCredentials: true,
      headers: { Accept: 'application/json' },
      timeout: 5000,
    })
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
    const staticStatus = await fetchStaticMaintenanceStatus()
    if (staticStatus !== null) {
      return applyMaintenanceState(staticStatus, { reloadOnChange })
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

function onDocumentVisibilityChange() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') {
    return
  }
  void checkMaintenanceStatus({ reloadOnChange: true })
}

function attachVisibilityListener() {
  if (visibilityListenerAttached || typeof document === 'undefined') {
    return
  }
  document.addEventListener('visibilitychange', onDocumentVisibilityChange)
  visibilityListenerAttached = true
}

function detachVisibilityListener() {
  if (!visibilityListenerAttached || typeof document === 'undefined') {
    return
  }
  document.removeEventListener('visibilitychange', onDocumentVisibilityChange)
  visibilityListenerAttached = false
}

function restartMaintenancePollingTimer() {
  if (pollTimer === null || typeof window === 'undefined') {
    return
  }
  window.clearInterval(pollTimer)
  pollTimer = window.setInterval(() => {
    void checkMaintenanceStatus({ reloadOnChange: true })
  }, pollIntervalMs)
}

export function startMaintenancePolling() {
  if (typeof window === 'undefined') {
    return
  }

  attachVisibilityListener()

  if (pollTimer === null) {
    void checkMaintenanceStatus({ reloadOnChange: true })
    pollTimer = window.setInterval(() => {
      void checkMaintenanceStatus({ reloadOnChange: true })
    }, pollIntervalMs)
    return
  }

  restartMaintenancePollingTimer()
}

export function stopMaintenancePolling() {
  detachVisibilityListener()

  if (pollTimer === null || typeof window === 'undefined') {
    return
  }
  window.clearInterval(pollTimer)
  pollTimer = null
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
