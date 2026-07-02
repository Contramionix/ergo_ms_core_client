import { ref, watch, markRaw } from 'vue'
import { Sun, Moon, LaptopMinimal, Bell, Grid3x3, Languages } from 'lucide-vue-next'
import {
  applyThemeModePreference,
  readThemePreference,
} from '@/js/theme-manager.js'

export const THEME_OPTIONS = [
  { id: 'light', name: 'Светлая', icon: markRaw(Sun) },
  { id: 'dark', name: 'Тёмная', icon: markRaw(Moon) },
  { id: 'auto', name: 'Системная', icon: markRaw(LaptopMinimal) },
]

export const ACTION_BUTTON_OPTIONS = [
  { id: 'notifications', name: 'Уведомления', icon: markRaw(Bell) },
  { id: 'apps', name: 'Меню приложений', icon: markRaw(Grid3x3) },
]

export const LANGUAGE_OPTIONS = [
  { id: 'ru', name: 'Русский', icon: markRaw(Languages) },
]

const THEME_BASE_KEY = 'theme'
const ACTION_BUTTON_BASE_KEY = 'actionButton'
const LANGUAGE_BASE_KEY = 'language'

const DEFAULT_THEME = 'auto'
const DEFAULT_ACTION_BUTTON = 'notifications'
const DEFAULT_LANGUAGE = 'ru'

const theme = ref(readThemePreference() || DEFAULT_THEME)
const actionButton = ref(localStorage.getItem(ACTION_BUTTON_BASE_KEY) || DEFAULT_ACTION_BUTTON)
const language = ref(localStorage.getItem(LANGUAGE_BASE_KEY) || DEFAULT_LANGUAGE)

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
  localStorage.setItem(LANGUAGE_BASE_KEY, val)
})

/** Синхронизирует реактивное состояние с localStorage (без сброса в дефолты). */
export function syncUiSettingsFromStorage() {
  theme.value = readThemePreference() || DEFAULT_THEME
  actionButton.value = localStorage.getItem(ACTION_BUTTON_BASE_KEY) || DEFAULT_ACTION_BUTTON
  language.value = localStorage.getItem(LANGUAGE_BASE_KEY) || DEFAULT_LANGUAGE
}

/**
 * При смене пользователя подтягивает сохранённые UI-настройки.
 * Предпочтения темы/языка не сбрасываются при logout или 401.
 */
export function initUserSettings(userId) {
  if (userId != null) return
  syncUiSettingsFromStorage()
}

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
