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

function flushFetchQueue() {
  flushTimer = null
  if (!fetchQueue.size) {
    return
  }

  const ids = [...fetchQueue]
  fetchQueue.clear()
  void fetchBatch(ids)
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

export function mergeSnapshot(users) {
  if (!Array.isArray(users)) {
    return
  }

  for (const user of users) {
    const id = normalizePublicId(user?.public_id)
    if (!id) {
      continue
    }
    state.entries[id] = normalizeEntry(user)
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
    state.entries[id] = normalizeEntry(entry)
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
  fetchQueue.clear()

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
  seedFromUsers,
  reset: resetPresenceStore,
}

export default presenceStore
