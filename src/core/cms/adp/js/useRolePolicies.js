import { ref } from 'vue'
import { CheckAccess } from '@/core/cms/js/cms'

// Глобальное состояние, общее для всех компонентов
const isInitialized = ref(false)
const isLoading = ref(false)
const error = ref(null)
const permissions = ref(null)

// Простое кеширование проверок по URL (страница) и действию
const urlAccessCache = {}

const loadMyPermissions = async () => {
  if (isInitialized.value || isLoading.value) {
    return
  }

  try {
    isLoading.value = true
    error.value = null

    const response = await CheckAccess.GetMyPermissions()
    permissions.value = response?.data || response
    isInitialized.value = true
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Ошибка загрузки пользовательских политик доступа', e)
    error.value = 'Не удалось загрузить политики доступа пользователя'
  } finally {
    isLoading.value = false
  }
}

const buildUrlKey = (url, action) => `${action || 'view'}::${url || ''}`

const checkUrlAccess = async (url, action = 'view') => {
  const key = buildUrlKey(url, action)

  if (Object.prototype.hasOwnProperty.call(urlAccessCache, key)) {
    return urlAccessCache[key]
  }

  try {
    const response = await CheckAccess.CheckURLAccess(url)
    const allowed = Boolean(response?.data?.access ?? response?.data?.allowed ?? response?.data)
    urlAccessCache[key] = allowed
    return allowed
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Ошибка проверки доступа по URL', e)
    urlAccessCache[key] = false
    return false
  }
}

/**
 * Компоузабл для работы с ролевыми политиками ADP на клиенте.
 * Даёт единый вход для всех Vue‑компонентов.
 */
export function useRolePolicies() {
  const ensureLoaded = async () => {
    await loadMyPermissions()
  }

  /**
   * Универсальная проверка по URL (ресурсу).
   * По умолчанию используется действие "view".
   */
  const canAccessUrl = async (url, action = 'view') => {
    await ensureLoaded()
    return checkUrlAccess(url, action)
  }

  /**
   * Примитивная проверка "есть ли у пользователя право/политика с указанным ключом".
   * Структура прав может отличаться между проектами, поэтому делаем максимально гибко.
   */
  const hasPermission = (permissionKey) => {
    if (!permissions.value || !permissionKey) {
      return false
    }

    return permissions.value.some((perm) => {
      if (!perm) {
        return false
      }

      if (typeof perm === 'string') {
        return perm === permissionKey
      }

      return (
        perm.code === permissionKey ||
        perm.name === permissionKey ||
        perm.key === permissionKey
      )
    })
  }

  return {
    isInitialized,
    isLoading,
    error,
    permissions,
    ensureLoaded,
    canAccessUrl,
    hasPermission
  }
}


