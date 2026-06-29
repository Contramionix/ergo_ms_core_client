import { reactive } from 'vue'

import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

/**
 * Переиспользуемый store онлайн-статуса пользователей.
 * Для UI (аватарки, таблицы): usePresenceStatus(userId) или getStatus(userId).
 */
const state = reactive({
  entries: {},
})

const pendingBatches = new Map()

function normalizeEntry(raw) {
  return {
    isOnline: Boolean(raw?.is_online),
    lastSeen: raw?.last_seen ?? null,
  }
}

function normalizeUserId(userId) {
  const parsed = Number(userId)
  return Number.isFinite(parsed) ? String(Math.trunc(parsed)) : null
}

export function mergeSnapshot(users) {
  if (!Array.isArray(users)) {
    return
  }

  for (const user of users) {
    const id = normalizeUserId(user?.user_id)
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

  for (const [userId, entry] of Object.entries(presenceObject)) {
    const id = normalizeUserId(userId)
    if (!id) {
      continue
    }
    state.entries[id] = normalizeEntry(entry)
  }
}

export function getStatus(userId) {
  const id = normalizeUserId(userId)
  if (!id) {
    return { isOnline: false, lastSeen: null }
  }
  return state.entries[id] ?? { isOnline: false, lastSeen: null }
}

export function hasStatus(userId) {
  const id = normalizeUserId(userId)
  return Boolean(id && state.entries[id])
}

export async function fetchBatch(userIds) {
  const ids = [...new Set(
    (userIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0),
  )]

  if (!ids.length) {
    return
  }

  const cacheKey = ids.slice().sort((a, b) => a - b).join(',')
  if (pendingBatches.has(cacheKey)) {
    return pendingBatches.get(cacheKey)
  }

  const promise = (async () => {
    try {
      const response = await apiClient.get(
        endpoints.cms.presence.batch,
        { user_ids: ids.join(',') },
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
      user_id: user.user_id,
      is_online: user.is_online,
      last_seen: user.last_seen,
    })),
  )
}

export function resetPresenceStore() {
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
  seedFromUsers,
  reset: resetPresenceStore,
}

export default presenceStore
