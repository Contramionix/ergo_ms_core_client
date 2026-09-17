import { reactive } from 'vue'

import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

/**
 * Store онлайн-статуса пользователей.
 * Ключи — public_id (UUID-строка), не числовой pk.
 */
const state = reactive({
  entries: {},
})

const pendingBatches = new Map()
const fetchQueue = new Set()
let flushTimer = null
const FLUSH_DELAY_MS = 16
const WATCH_NOTIFY_MS = 50
const WATCH_LIMIT = 100

const watchCounts = new Map()
let watchListener = null
let watchNotifyTimer = null

const CLOCK_MS = 10000
const clock = reactive({ now: Date.now() })
let clockTimer = null

function onPresenceClockVisible() {
  if (document.visibilityState === 'visible') {
    clock.now = Date.now()
  }
}

function syncPresenceClock() {
  const shouldRun = watchCounts.size > 0
  if (shouldRun && !clockTimer) {
    clock.now = Date.now()
    clockTimer = window.setInterval(() => {
      clock.now = Date.now()
    }, CLOCK_MS)
    document.addEventListener('visibilitychange', onPresenceClockVisible)
    return
  }
  if (!shouldRun && clockTimer) {
    window.clearInterval(clockTimer)
    clockTimer = null
    document.removeEventListener('visibilitychange', onPresenceClockVisible)
  }
}

/** Текущий тик часов presence — чтобы «только что» сменялось без перезагрузки. */
export function readPresenceNow() {
  return clock.now
}

/** public_id текущего пользователя с активным presence-транспортом (WS/SSE/poll). */
let liveSelfPublicId = null

function flushFetchQueue() {
  flushTimer = null
  if (!fetchQueue.size) {
    return
  }

  const ids = [...fetchQueue]
  fetchQueue.clear()
  void fetchBatch(ids)
}

export function setPresenceWatchListener(listener) {
  watchListener = listener
  if (watchCounts.size && listener) {
    notifyWatchListener()
  }
}

function notifyWatchListener() {
  if (!watchListener) {
    return
  }
  if (watchNotifyTimer) {
    return
  }
  watchNotifyTimer = setTimeout(() => {
    watchNotifyTimer = null
    watchListener(listWatchedPublicIds())
  }, WATCH_NOTIFY_MS)
}

export function listWatchedPublicIds() {
  return [...watchCounts.keys()].slice(0, WATCH_LIMIT)
}

export function watchPresence(publicId) {
  const id = normalizePublicId(publicId)
  if (!id) {
    return
  }
  const previous = watchCounts.get(id) || 0
  watchCounts.set(id, previous + 1)
  if (previous === 0) {
    syncPresenceClock()
    notifyWatchListener()
  }
}

export function unwatchPresence(publicId) {
  const id = normalizePublicId(publicId)
  if (!id || !watchCounts.has(id)) {
    return
  }
  const next = watchCounts.get(id) - 1
  if (next <= 0) {
    watchCounts.delete(id)
    syncPresenceClock()
    notifyWatchListener()
    return
  }
  watchCounts.set(id, next)
}

export function enqueueFetch(publicId) {
  const id = normalizePublicId(publicId)
  if (!id || hasStatus(id)) {
    return
  }

  fetchQueue.add(id)

  if (flushTimer) {
    return
  }

  flushTimer = setTimeout(flushFetchQueue, FLUSH_DELAY_MS)
}

function normalizeEntry(raw) {
  return {
    isOnline: Boolean(raw?.is_online),
    lastSeen: raw?.last_seen ?? null,
  }
}

function normalizePublicId(value) {
  if (value == null || value === '') {
    return null
  }
  const raw = String(value).trim()
  if (!raw || /^\d+$/.test(raw)) {
    return null
  }
  return raw
}

function writeEntry(id, raw) {
  const entry = normalizeEntry(raw)
  // Пока локальная presence-сессия жива, не даём устаревшему batch
  // (запрос ушёл до heartbeat/WS connect) затереть «в сети» у аватара в меню.
  if (id === liveSelfPublicId) {
    state.entries[id] = {
      isOnline: true,
      lastSeen: entry.lastSeen || new Date().toISOString(),
    }
    return
  }
  state.entries[id] = entry
}

/**
 * Пометить текущего пользователя онлайн по факту подключения presence-транспорта.
 * Нужен для индикатора в UserMenu: batch часто отвечает раньше heartbeat.
 */
export function setLiveSelfPresence(publicId) {
  const id = normalizePublicId(publicId)
  liveSelfPublicId = id
  if (!id) {
    return
  }
  state.entries[id] = {
    isOnline: true,
    lastSeen: new Date().toISOString(),
  }
}

export function clearLiveSelfPresence() {
  const id = liveSelfPublicId
  liveSelfPublicId = null
  if (!id || !state.entries[id]) {
    return
  }
  state.entries[id] = {
    isOnline: false,
    lastSeen: new Date().toISOString(),
  }
}

export function mergeSnapshot(users) {
  if (!Array.isArray(users)) {
    return
  }

  for (const user of users) {
    const id = normalizePublicId(user?.public_id)
    if (!id) {
      continue
    }
    writeEntry(id, user)
  }
}

export function applyBatch(presenceObject) {
  if (!presenceObject || typeof presenceObject !== 'object') {
    return
  }

  for (const [publicId, entry] of Object.entries(presenceObject)) {
    const id = normalizePublicId(publicId)
    if (!id) {
      continue
    }
    writeEntry(id, entry)
  }
}

export function getStatus(publicId) {
  const id = normalizePublicId(publicId)
  if (!id) {
    return { isOnline: false, lastSeen: null }
  }
  return state.entries[id] ?? { isOnline: false, lastSeen: null }
}

export function hasStatus(publicId) {
  const id = normalizePublicId(publicId)
  return Boolean(id && state.entries[id])
}

export async function fetchBatch(publicIds) {
  const ids = [...new Set(
    (publicIds || [])
      .map((id) => normalizePublicId(id))
      .filter(Boolean),
  )]

  if (!ids.length) {
    return
  }

  const cacheKey = ids.slice().sort().join(',')
  if (pendingBatches.has(cacheKey)) {
    return pendingBatches.get(cacheKey)
  }

  const promise = (async () => {
    try {
      const response = await apiClient.get(
        endpoints.cms.presence.batch,
        { public_ids: ids.join(',') },
        true,
      )
      if (response.success) {
        applyBatch(response.data?.presence)
      }
    } finally {
      pendingBatches.delete(cacheKey)
    }
  })()

  pendingBatches.set(cacheKey, promise)
  return promise
}

export function seedFromUsers(users) {
  if (!Array.isArray(users)) {
    return
  }

  mergeSnapshot(
    users.map((user) => ({
      public_id: user.public_id,
      is_online: user.is_online,
      last_seen: user.last_seen,
    })),
  )
}

export function resetPresenceStore() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (watchNotifyTimer) {
    clearTimeout(watchNotifyTimer)
    watchNotifyTimer = null
  }
  fetchQueue.clear()
  watchCounts.clear()
  liveSelfPublicId = null
  syncPresenceClock()

  for (const key of Object.keys(state.entries)) {
    delete state.entries[key]
  }
}

export const presenceStore = {
  state,
  mergeSnapshot,
  applyBatch,
  getStatus,
  hasStatus,
  fetchBatch,
  enqueueFetch,
  watchPresence,
  unwatchPresence,
  listWatchedPublicIds,
  readPresenceNow,
  setPresenceWatchListener,
  seedFromUsers,
  setLiveSelfPresence,
  clearLiveSelfPresence,
  reset: resetPresenceStore,
}

export default presenceStore
