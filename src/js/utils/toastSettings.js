import { ref, watch } from 'vue'

const STORAGE_KEY = 'ergo_toast_settings'

export const TOAST_POSITION_OPTIONS = [
  { id: 'top-right', name: 'Вверху справа' },
  { id: 'top-left', name: 'Вверху слева' },
  { id: 'top-center', name: 'Вверху по центру' },
  { id: 'bottom-right', name: 'Внизу справа' },
  { id: 'bottom-left', name: 'Внизу слева' },
  { id: 'bottom-center', name: 'Внизу по центру' },
]

export const TOAST_DURATION_PRESET_OPTIONS = [
  { id: 'short', name: 'Короткая (2–4 сек)' },
  { id: 'normal', name: 'Обычная (3–5 сек)' },
  { id: 'long', name: 'Длинная (5–8 сек)' },
  { id: 'persistent', name: 'До ручного закрытия' },
]

export const TOAST_MAX_OPTIONS = [1, 2, 3, 4, 5, 6].map((value) => ({
  id: value,
  name: String(value),
}))

const DURATION_PRESETS = {
  short: {
    default: 2000,
    success: 2000,
    error: 4000,
    warning: 3000,
    info: 2000,
  },
  normal: {
    default: 3000,
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000,
  },
  long: {
    default: 5000,
    success: 5000,
    error: 8000,
    warning: 6000,
    info: 5000,
  },
  persistent: {
    default: false,
    success: false,
    error: false,
    warning: false,
    info: false,
  },
}

const DEFAULT_SETTINGS = {
  enabled: true,
  position: 'top-right',
  durationPreset: 'normal',
  maxToasts: 4,
  pauseOnHover: true,
  draggable: true,
  hideProgressBar: false,
}

const changeListeners = new Set()

function normalizeSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS }
  }

  const position = TOAST_POSITION_OPTIONS.some((item) => item.id === raw.position)
    ? raw.position
    : DEFAULT_SETTINGS.position

  const durationPreset = TOAST_DURATION_PRESET_OPTIONS.some((item) => item.id === raw.durationPreset)
    ? raw.durationPreset
    : DEFAULT_SETTINGS.durationPreset

  const maxToasts = TOAST_MAX_OPTIONS.some((item) => item.id === raw.maxToasts)
    ? raw.maxToasts
    : DEFAULT_SETTINGS.maxToasts

  return {
    enabled: raw.enabled !== false,
    position,
    durationPreset,
    maxToasts,
    pauseOnHover: raw.pauseOnHover !== false,
    draggable: raw.draggable !== false,
    hideProgressBar: raw.hideProgressBar === true,
  }
}

function readStoredSettings() {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_SETTINGS }
    }
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function persistSettings(value) {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function notifyChangeListeners(value) {
  changeListeners.forEach((listener) => {
    listener(value)
  })
}

const settings = ref(readStoredSettings())

watch(
  settings,
  (value) => {
    const normalized = normalizeSettings(value)
    persistSettings(normalized)
    notifyChangeListeners(normalized)
  },
  { deep: true },
)

export function getToastSettingsSnapshot() {
  return normalizeSettings(settings.value)
}

export function getToastTimeouts(preset = settings.value.durationPreset) {
  return DURATION_PRESETS[preset] || DURATION_PRESETS.normal
}

export function isToastEnabled() {
  return settings.value.enabled !== false
}

export function subscribeToastSettingsChange(listener) {
  changeListeners.add(listener)
  return () => {
    changeListeners.delete(listener)
  }
}

export function useToastSettings() {
  return {
    settings,
    TOAST_POSITION_OPTIONS,
    TOAST_DURATION_PRESET_OPTIONS,
    TOAST_MAX_OPTIONS,
  }
}
