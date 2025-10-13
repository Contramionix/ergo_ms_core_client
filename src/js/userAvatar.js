// Кэш аватаров пользователей в пределах сессии SPA
import { apiClient } from '@/js/api/manager'

const userAvatarCache = new Map()
export const defaultAvatar = null

export async function getUserAvatar(userId) {
  if (!userId) return defaultAvatar
  if (userAvatarCache.has(userId)) {
    return userAvatarCache.get(userId)
  }
  try {
    const resp = await apiClient.get('/crm/users/', { id: userId })
    const data = Array.isArray(resp?.data) ? resp.data : (resp?.data?.results || [])
    const user = Array.isArray(data) ? (data.find(u => u.id === userId) || data[0]) : null
    const avatarUrl = user?.avatar_url || null
    const result = avatarUrl ?? defaultAvatar
    userAvatarCache.set(userId, result)
    return result
  } catch (e) {
    userAvatarCache.set(userId, defaultAvatar)
    return defaultAvatar
  }
}

export function getCachedUserAvatar(userId) {
  return userAvatarCache.get(userId) ?? null
}

export function clearUserAvatarCache() {
  userAvatarCache.clear()
}


