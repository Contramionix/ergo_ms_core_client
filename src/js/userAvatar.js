// Кэш публичных данных пользователей в пределах сессии SPA.
// Хранит first_name/last_name/full_name/avatar_url по user_id,
// чтобы UserAvatar.vue мог стабильно отображать инициалы, цвет и аватар.
import { apiClient } from '@/js/api/manager'

const userInfoCache = new Map()
const pendingRequests = new Map()
const SIGNED_URL_MIN_SECONDS_LEFT = 60

export const defaultAvatar = null

function normalizeId(userId) {
  if (userId == null) return null
  const num = Number(userId)
  return Number.isFinite(num) ? Math.trunc(num) : null
}

function getExpiresMeta(url) {
  try {
    if (!url) return { hasSignature: false, secondsLeft: null }
    const parsed = new URL(url, window.location.origin)
    const expiresRaw = parsed.searchParams.get('expires')
    const expires = expiresRaw ? Number(expiresRaw) : null
    const nowSec = Math.floor(Date.now() / 1000)
    return {
      hasSignature: Boolean(parsed.searchParams.get('signature')),
      secondsLeft: Number.isFinite(expires) ? (expires - nowSec) : null,
    }
  } catch {
    return { hasSignature: false, secondsLeft: null }
  }
}

function isAvatarUrlExpired(url) {
  const { hasSignature, secondsLeft } = getExpiresMeta(url)
  return hasSignature && secondsLeft !== null && secondsLeft < SIGNED_URL_MIN_SECONDS_LEFT
}

function normalizeInfo(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = normalizeId(raw.user_id ?? raw.id)
  if (id === null) return null
  return {
    userId: id,
    username: raw.username || '',
    firstName: raw.first_name || raw.firstName || '',
    lastName: raw.last_name || raw.lastName || '',
    middleName: raw.middle_name || raw.middleName || '',
    fullName: raw.full_name || raw.fullName || '',
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? null,
  }
}

/**
 * Разбирает ФИО формата «Фамилия Имя [Отчество]» для UserAvatar без запроса public-info.
 */
export function parseFullNameParts(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] }
  }
  return {
    firstName: parts[1] || parts[0],
    lastName: parts[0],
  }
}

/**
 * Прогревает кеш публичных данных из уже загруженных списков (members, candidates).
 */
export function seedUserPublicInfoCache(entries) {
  if (!Array.isArray(entries)) return
  for (const entry of entries) {
    const info = normalizeInfo(entry)
    if (info) {
      userInfoCache.set(info.userId, info)
    }
  }
}

export async function getUserPublicInfo(userId) {
  const id = normalizeId(userId)
  if (id === null) return null

  if (userInfoCache.has(id)) {
    const cached = userInfoCache.get(id)
    if (!isAvatarUrlExpired(cached?.avatarUrl)) return cached
    userInfoCache.delete(id)
  }

  if (pendingRequests.has(id)) return pendingRequests.get(id)

  const promise = apiClient
    .get(`/cms/users/${id}/public-info/`)
    .then((resp) => {
      const raw = resp?.data ?? resp
      const info = normalizeInfo(raw) ?? { userId: id, username: '', firstName: '', lastName: '', middleName: '', fullName: '', avatarUrl: null }
      userInfoCache.set(id, info)
      return info
    })
    .catch(() => {
      const fallback = { userId: id, username: '', firstName: '', lastName: '', middleName: '', fullName: '', avatarUrl: null }
      userInfoCache.set(id, fallback)
      return fallback
    })
    .finally(() => pendingRequests.delete(id))

  pendingRequests.set(id, promise)
  return promise
}

export function getCachedUserPublicInfo(userId) {
  const id = normalizeId(userId)
  if (id === null) return null
  return userInfoCache.get(id) ?? null
}

export function invalidateUserPublicInfo(userId) {
  const id = normalizeId(userId)
  if (id !== null) userInfoCache.delete(id)
}

export function clearUserPublicInfoCache() {
  userInfoCache.clear()
}

// Обратная совместимость: старый API возвращал только avatarUrl
export async function getUserAvatar(userId) {
  const info = await getUserPublicInfo(userId)
  return info?.avatarUrl ?? defaultAvatar
}

export function getCachedUserAvatar(userId) {
  return getCachedUserPublicInfo(userId)?.avatarUrl ?? null
}

export function clearUserAvatarCache() {
  clearUserPublicInfoCache()
}

export function invalidateUserAvatar(userId) {
  invalidateUserPublicInfo(userId)
}
