import { ref, watch, markRaw } from 'vue'
import { Sun, Moon, LaptopMinimal, Bell, Grid3x3, Languages } from 'lucide-vue-next'

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
const LAST_USER_KEY = '_uiLastUserId'

let _userId = null

const userKey = (base) => (_userId ? `${base}_${_userId}` : base)

// Читаем ID последнего вошедшего пользователя, сохранённый при предыдущей сессии.
// Это позволяет загрузить user-специфичные настройки синхронно до первого рендера,
// не дожидаясь асинхронной инициализации userStore.
const _lastUserId = localStorage.getItem(LAST_USER_KEY)
const _read = (base) =>
  (_lastUserId ? localStorage.getItem(`${base}_${_lastUserId}`) : null)
    ?? localStorage.getItem(base)

const theme = ref(_read(THEME_BASE_KEY) || 'auto')
const actionButton = ref(_read(ACTION_BUTTON_BASE_KEY) || 'notifications')
const language = ref(_read(LANGUAGE_BASE_KEY) || 'ru')

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

/**
 * Вызывается при входе/выходе пользователя.
 * Обновляет кэшированный ID и загружает личные настройки пользователя.
 */
export function initUserSettings(userId) {
  if (userId === _userId) return
  _userId = userId

  if (userId) {
    localStorage.setItem(LAST_USER_KEY, String(userId))
  } else {
    localStorage.removeItem(LAST_USER_KEY)
  }

  const savedTheme = localStorage.getItem(userKey(THEME_BASE_KEY))
  if (savedTheme) {
    theme.value = savedTheme
    applyThemeToDom(savedTheme)
  }

  const savedActionButton = localStorage.getItem(userKey(ACTION_BUTTON_BASE_KEY))
  actionButton.value = savedActionButton || 'notifications'

  const savedLanguage = localStorage.getItem(userKey(LANGUAGE_BASE_KEY))
  language.value = savedLanguage || 'ru'

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
