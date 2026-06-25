import { ref, watch, markRaw } from 'vue'
import { Sun, Moon, LaptopMinimal, Bell, Grid3x3, Languages } from 'lucide-vue-next'
import { getUserId, registerUiSettingsReset } from './tokenStorage.js'

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
const LEGACY_LAST_USER_KEY = '_uiLastUserId'

const DEFAULT_THEME = 'auto'
const DEFAULT_ACTION_BUTTON = 'notifications'
const DEFAULT_LANGUAGE = 'ru'

let _userId = getUserId()

const userKey = (base) => (_userId ? `${base}_${_userId}` : base)

const _read = (base) => {
  if (_userId) {
    return localStorage.getItem(`${base}_${_userId}`) ?? localStorage.getItem(base)
  }
  return localStorage.getItem(base)
}

try {
  localStorage.removeItem(LEGACY_LAST_USER_KEY)
} catch {
  // ignore
}

const theme = ref(_read(THEME_BASE_KEY) || DEFAULT_THEME)
const actionButton = ref(_read(ACTION_BUTTON_BASE_KEY) || DEFAULT_ACTION_BUTTON)
const language = ref(_read(LANGUAGE_BASE_KEY) || DEFAULT_LANGUAGE)

const applyThemeToDom = (value) => {
  const resolved =
    value === 'auto'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : value
  document.documentElement.setAttribute('data-bs-theme', resolved)
}

watch(theme, (val) => {
  localStorage.setItem(userKey(THEME_BASE_KEY), val)
  applyThemeToDom(val)
})

watch(actionButton, (val) => {
  localStorage.setItem(userKey(ACTION_BUTTON_BASE_KEY), val)
})

watch(language, (val) => {
  localStorage.setItem(userKey(LANGUAGE_BASE_KEY), val)
})

export function resetUserSettings() {
  _userId = null
  theme.value = DEFAULT_THEME
  actionButton.value = DEFAULT_ACTION_BUTTON
  language.value = DEFAULT_LANGUAGE
  applyThemeToDom(DEFAULT_THEME)
}

registerUiSettingsReset(resetUserSettings)

/**
 * Вызывается при входе/выходе пользователя.
 * Загружает личные настройки пользователя после инициализации userStore.
 */
export function initUserSettings(userId) {
  const normalizedId = userId != null ? String(userId) : null

  if (!normalizedId) {
    resetUserSettings()
    return
  }

  if (normalizedId === _userId) return
  _userId = normalizedId

  const savedTheme = localStorage.getItem(userKey(THEME_BASE_KEY))
  if (savedTheme) {
    theme.value = savedTheme
    applyThemeToDom(savedTheme)
  }

  actionButton.value = localStorage.getItem(userKey(ACTION_BUTTON_BASE_KEY)) || DEFAULT_ACTION_BUTTON
  language.value = localStorage.getItem(userKey(LANGUAGE_BASE_KEY)) || DEFAULT_LANGUAGE

  localStorage.removeItem(ACTION_BUTTON_BASE_KEY)
  localStorage.removeItem(LANGUAGE_BASE_KEY)
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
