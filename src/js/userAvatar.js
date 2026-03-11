// Кэш аватаров пользователей в пределах сессии SPA
import { apiClient } from '@/js/api/manager'

const userAvatarCache = new Map()
export const defaultAvatar = null

function getExpiresMeta(url) {
  try {
    if (!url) return { expires: null, secondsLeft: null, hasSignature: false }
    const parsed = new URL(url, window.location.origin)
    const expiresRaw = parsed.searchParams.get('expires')
    const expires = expiresRaw ? Number(expiresRaw) : null
    const nowSec = Math.floor(Date.now() / 1000)
    return {
      expires: Number.isFinite(expires) ? expires : null,
      secondsLeft: Number.isFinite(expires) ? (expires - nowSec) : null,
      hasSignature: Boolean(parsed.searchParams.get('signature')),
    }
  } catch {
    return { expires: null, secondsLeft: null, hasSignature: false }
  }
}

function extractUser(raw, userId) {
  if (!raw) return null

  // Варианты ответов: объект с данными пользователя
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    // Если пришёл объект пользователя напрямую
    if (raw.id !== undefined) {
      return raw
    }
    // Если завернули в data / user
    if (raw.data && typeof raw.data === 'object') {
      return extractUser(raw.data, userId)
    }
    if (raw.user && typeof raw.user === 'object') {
      return raw.user
    }
  }

  // Варианты ответов: массив или results
  const list = Array.isArray(raw) ? raw : raw.results || raw.data || []
  if (Array.isArray(list)) {
    const match = list.find((u) => Number(u.id) === Number(userId))
    return match || list[0] || null
  }

  return null
}

function extractAvatarUrl(user) {
  if (!user) return null
  return (
    user.avatar_url ||
    user.avatarUrl ||
    user.avatar?.url ||
    user.avatar?.image ||
    user.avatar?.image?.url ||
    user.photo ||
    user.image ||
    null
  )
}

const pendingRequests = new Map()

const SIGNED_URL_MIN_SECONDS_LEFT = 60

export async function getUserAvatar(userId) {
  if (!userId) return defaultAvatar
  if (userAvatarCache.has(userId)) {
    const cachedUrl = userAvatarCache.get(userId)
    const cachedMeta = getExpiresMeta(cachedUrl)
    const isExpiredOrExpiring = cachedMeta.hasSignature && cachedMeta.secondsLeft !== null && cachedMeta.secondsLeft < SIGNED_URL_MIN_SECONDS_LEFT
    if (isExpiredOrExpiring) {
      userAvatarCache.delete(userId)
    } else {
      return cachedUrl
    }
  }
  if (pendingRequests.has(userId)) return pendingRequests.get(userId)

  const promise = apiClient.get('/cms/get_user_name/', { id: userId })
    .then(resp => {
      const raw = resp?.data ?? resp?.results ?? resp
      const user = extractUser(raw, userId)
      const result = extractAvatarUrl(user) ?? defaultAvatar
      userAvatarCache.set(userId, result)
      return result
    })
    .catch(() => {
      userAvatarCache.set(userId, defaultAvatar)
      return defaultAvatar
    })
    .finally(() => pendingRequests.delete(userId))

  pendingRequests.set(userId, promise)
  return promise
}

export function getCachedUserAvatar(userId) {
  return userAvatarCache.get(userId) ?? null
}

export function clearUserAvatarCache() {
  userAvatarCache.clear()
}

export function invalidateUserAvatar(userId) {
  if (userId != null) userAvatarCache.delete(Number(userId))
}


