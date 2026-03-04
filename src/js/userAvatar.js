// Кэш аватаров пользователей в пределах сессии SPA
import { apiClient } from '@/js/api/manager'

const userAvatarCache = new Map()
export const defaultAvatar = null

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

export async function getUserAvatar(userId) {
  if (!userId) return defaultAvatar
  if (userAvatarCache.has(userId)) return userAvatarCache.get(userId)
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


