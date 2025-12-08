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
    // Используем общий эндпоинт CMS, чтобы избежать 404 на /crm/users/
    const resp = await apiClient.get('/cms/get_user_name/', { id: userId })
    const raw = resp?.data ?? resp?.results ?? resp
    const data = Array.isArray(raw) ? raw : raw?.results || []
    const user = Array.isArray(data)
      ? (data.find((u) => Number(u.id) === Number(userId)) || data[0])
      : (raw && typeof raw === 'object' ? raw : null)
    const avatarUrl = user?.avatar_url || user?.avatar?.url || null
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


