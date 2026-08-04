/**
 * Личный выбор палитры (серверные предпочтения).
 */
import { ref } from 'vue'
import { apiClient } from '@/js/api/manager'
import { endpoints, initEndpoints } from '@/js/api/endpoints.js'
import { syncSiteThemeFromApi } from '@/js/theme-service.js'
import { logWarn } from '@/js/utils/logError.js'

const selectedThemeId = ref(null)
const selectedThemePair = ref(null)
const favoriteIds = ref([])
const defaultThemeId = ref(null)
const defaultThemePair = ref(null)
const catalog = ref([])
const loading = ref(false)

function applyPreferencePayload(data) {
  if (!data || typeof data !== 'object') {
    return
  }
  selectedThemeId.value = data.selected_theme_id ?? null
  selectedThemePair.value = data.selected_theme_pair ?? null
  favoriteIds.value = Array.isArray(data.favorite_ids) ? [...data.favorite_ids] : []
  defaultThemeId.value = data.default_theme_id ?? null
  defaultThemePair.value = data.default_theme_pair ?? null
}

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (typeof data?.error === 'string') {
    return data.error
  }
  if (typeof data?.detail === 'string') {
    return data.detail
  }
  if (typeof data?.message === 'string') {
    return data.message
  }
  return error?.message || fallback
}

export async function loadThemeCatalog() {
  await initEndpoints()
  try {
    const res = await apiClient.get(endpoints.themes.catalog)
    if (res.success && Array.isArray(res.data)) {
      catalog.value = res.data
      return catalog.value
    }
  } catch (e) {
    logWarn('Не удалось загрузить каталог тем', e)
  }
  catalog.value = []
  return catalog.value
}

export async function loadUserThemePreference() {
  await initEndpoints()
  loading.value = true
  try {
    const res = await apiClient.get(endpoints.themes.me)
    if (res.success && res.data) {
      applyPreferencePayload(res.data)
      return res.data
    }
  } catch (e) {
    logWarn('Не удалось загрузить предпочтения темы', e)
  } finally {
    loading.value = false
  }
  return null
}

async function postPreference(endpoint, body, fallbackError) {
  await initEndpoints()
  try {
    const res = await apiClient.post(endpoint, body)
    if (!res.success) {
      throw new Error(res.message || res.data?.error || fallbackError)
    }
    applyPreferencePayload(res.data)
    return res.data
  } catch (e) {
    if (e instanceof Error && !e.response) {
      throw e
    }
    throw new Error(apiErrorMessage(e, fallbackError))
  }
}

export async function selectUserTheme(themeId) {
  const data = await postPreference(
    endpoints.themes.selectMine,
    { theme_id: themeId },
    'Не удалось выбрать тему',
  )
  await syncSiteThemeFromApi()
  return data
}

export async function resetUserThemeToSiteDefault() {
  return selectUserTheme(null)
}

export async function ensureThemePreferenceLoaded() {
  await Promise.all([loadThemeCatalog(), loadUserThemePreference()])
}

export function useUserThemePreference() {
  return {
    selectedThemeId,
    selectedThemePair,
    favoriteIds,
    defaultThemeId,
    defaultThemePair,
    catalog,
    loading,
    loadThemeCatalog,
    loadUserThemePreference,
    ensureThemePreferenceLoaded,
    selectUserTheme,
    resetUserThemeToSiteDefault,
  }
}
