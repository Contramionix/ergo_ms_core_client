import { ref, watch, markRaw, computed } from 'vue'
import { Sun, Moon, LaptopMinimal, Bell, Grid3x3, Languages } from 'lucide-vue-next'
import {
  applyThemeModePreference,
  readThemePreference,
} from '@/js/theme-manager.js'
import { syncUiPreferencesFromStorage } from '@/core/cms/js/uiPreferencesSettings.js'
import {
  getCurrentLocale,
  getDefaultLocale,
  getLanguageOptions,
  normalizeLocale,
  setAppLocale,
  tGlobal,
} from '@/i18n/index.js'
import { apiClient } from '@/js/api/manager.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'
import { getAccess } from '@/core/cms/js/tokenStorage.js'
import { logError } from '@/js/utils/logError.js'

export const THEME_OPTIONS = computed(() => {
  getCurrentLocale()
  return [
    { id: 'light', name: tGlobal('settings.system.themeLight'), icon: markRaw(Sun) },
    { id: 'dark', name: tGlobal('settings.system.themeDark'), icon: markRaw(Moon) },
    { id: 'auto', name: tGlobal('settings.system.themeAuto'), icon: markRaw(LaptopMinimal) },
  ]
})

export const ACTION_BUTTON_OPTIONS = computed(() => {
  getCurrentLocale()
  return [
    {
      id: 'notifications',
      name: tGlobal('settings.system.actionNotifications'),
      icon: markRaw(Bell),
    },
    {
      id: 'apps',
      name: tGlobal('settings.system.actionApps'),
      icon: markRaw(Grid3x3),
    },
  ]
})

export const LANGUAGE_OPTIONS = computed(() => {
  getCurrentLocale()
  return getLanguageOptions().map((opt) => ({
    ...opt,
    icon: markRaw(Languages),
  }))
})

const THEME_BASE_KEY = 'theme'
const ACTION_BUTTON_BASE_KEY = 'actionButton'
const LANGUAGE_BASE_KEY = 'language'

const DEFAULT_THEME = 'auto'
const DEFAULT_ACTION_BUTTON = 'notifications'

const theme = ref(readThemePreference() || DEFAULT_THEME)
const actionButton = ref(localStorage.getItem(ACTION_BUTTON_BASE_KEY) || DEFAULT_ACTION_BUTTON)
const language = ref(
  normalizeLocale(localStorage.getItem(LANGUAGE_BASE_KEY) || getDefaultLocale()),
)

/** Не слать PATCH профиля при применении языка из профиля / storage. */
let skipLanguagePersist = false

watch(
  theme,
  (val) => {
    applyThemeModePreference(val)
  },
  { immediate: false },
)

watch(actionButton, (val) => {
  localStorage.setItem(ACTION_BUTTON_BASE_KEY, val)
})

watch(language, (val) => {
  const normalized = normalizeLocale(val)
  if (normalized !== val) {
    language.value = normalized
    return
  }
  localStorage.setItem(LANGUAGE_BASE_KEY, normalized)
  setAppLocale(normalized)
  if (!skipLanguagePersist) {
    void persistLanguageToProfile(normalized)
  }
})

async function persistLanguageToProfile(locale) {
  if (!getAccess()) {
    return
  }
  try {
    await apiClient.put(endpoints.auth.profile, { language: locale })
  } catch (error) {
    logError('Не удалось сохранить язык профиля:', error)
  }
}

/**
 * Применяет язык из профиля API без повторного PATCH.
 * @param {string} locale
 */
export function applyLanguageFromProfile(locale) {
  const normalized = normalizeLocale(locale)
  if (language.value === normalized) {
    setAppLocale(normalized)
    return
  }
  skipLanguagePersist = true
  try {
    language.value = normalized
    localStorage.setItem(LANGUAGE_BASE_KEY, normalized)
    setAppLocale(normalized)
  } finally {
    skipLanguagePersist = false
  }
}

/** Синхронизирует реактивное состояние с localStorage (без сброса в дефолты). */
export function syncUiSettingsFromStorage() {
  theme.value = readThemePreference() || DEFAULT_THEME
  actionButton.value = localStorage.getItem(ACTION_BUTTON_BASE_KEY) || DEFAULT_ACTION_BUTTON
  const stored = normalizeLocale(localStorage.getItem(LANGUAGE_BASE_KEY) || getDefaultLocale())
  skipLanguagePersist = true
  try {
    language.value = stored
    setAppLocale(stored)
  } finally {
    skipLanguagePersist = false
  }
  syncUiPreferencesFromStorage()
}

/**
 * При смене пользователя подтягивает сохранённые UI-настройки.
 * Предпочтения темы/языка не сбрасываются при logout или 401.
 */
export function initUserSettings(userId) {
  if (userId != null) return
  syncUiSettingsFromStorage()
}

/** Начальная синхронизация locale при загрузке модуля. */
setAppLocale(language.value)

export function useUiSettings() {
  return {
    theme,
    actionButton,
    language,
    THEME_OPTIONS,
    ACTION_BUTTON_OPTIONS,
    LANGUAGE_OPTIONS,
  }
}
