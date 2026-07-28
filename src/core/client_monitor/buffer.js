import { useMaintenanceMode } from '@/composables/useMaintenanceMode.js'
import tokenService from '@/core/cms/js/tokenService.js'
import {
  buildSessionMeta,
  getOrCreateMonitorSessionId,
  isMonitoringEnabled,
  nextMonitorSeq,
} from './session.js'
import { postMonitorBatchKeepalive, postMonitorBatchSilent } from './transport.js'

const FLUSH_INTERVAL_MS = 4000
const MAX_BUFFER = 200

/** @type {Array<object>} */
let queue = []
let flushTimer = null
let installedLifecycle = false
let flushing = false

function shouldCollect() {
  if (!isMonitoringEnabled()) {
    return false
  }
  if (!tokenService.getAccess()) {
    return false
  }
  const { maintenanceActive } = useMaintenanceMode()
  if (maintenanceActive.value) {
    return false
  }
  return true
}

function buildPayload(events) {
  return {
    session_id: getOrCreateMonitorSessionId(),
    session_meta: buildSessionMeta(),
    events,
  }
}

export function enqueueMonitorEvent(kind, payload = {}) {
  if (!shouldCollect()) {
    return
  }
  if (!kind || typeof kind !== 'string') {
    return
  }
  queue.push({
    seq: nextMonitorSeq(),
    kind,
    ts: new Date().toISOString(),
    payload: payload && typeof payload === 'object' ? payload : {},
  })
  if (queue.length > MAX_BUFFER) {
    queue.splice(0, queue.length - MAX_BUFFER)
  }
  ensureFlushTimer()
}

export async function flushMonitorBuffer({ keepalive = false } = {}) {
  if (flushing || !queue.length) {
    return
  }
  if (!tokenService.getAccess()) {
    return
  }
  if (!keepalive && !shouldCollect()) {
    return
  }
  const events = queue.splice(0, queue.length)
  const payload = buildPayload(events)
  flushing = true
  try {
    if (keepalive) {
      postMonitorBatchKeepalive(payload)
    } else {
      await postMonitorBatchSilent(payload)
    }
  } finally {
    flushing = false
  }
}

/** Синхронный flush перед logout (токен ещё в памяти). */
export function flushMonitorBufferSyncKeepalive() {
  if (!queue.length || !tokenService.getAccess()) {
    return
  }
  const events = queue.splice(0, queue.length)
  postMonitorBatchKeepalive(buildPayload(events))
}


function ensureFlushTimer() {
  if (flushTimer != null) {
    return
  }
  flushTimer = setInterval(() => {
    void flushMonitorBuffer()
  }, FLUSH_INTERVAL_MS)
}

function onVisibilityChange() {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    void flushMonitorBuffer({ keepalive: true })
  }
}

function onPageHide() {
  void flushMonitorBuffer({ keepalive: true })
}

export function installMonitorBufferLifecycle() {
  if (installedLifecycle || typeof window === 'undefined') {
    return
  }
  installedLifecycle = true
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)
  ensureFlushTimer()
}

export function stopMonitorBuffer() {
  if (flushTimer != null) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  queue = []
}
