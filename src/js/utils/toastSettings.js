import { computed, ref, watch } from 'vue'

import { tGlobal } from '@/i18n/index.js'

const STORAGE_KEY = 'ergo_toast_settings'

const TOAST_POSITION_IDS = [
  'top-right',
  'top-left',
  'top-center',
  'bottom-right',
  'bottom-left',
  'bottom-center',
]

const TOAST_DURATION_PRESET_IDS = ['short', 'normal', 'long', 'persistent']

const POSITION_LABEL_KEYS = {
  'top-right': 'settings.toasts.posTopRight',
  'top-left': 'settings.toasts.posTopLeft',
  'top-center': 'settings.toasts.posTopCenter',
  'bottom-right': 'settings.toasts.posBottomRight',
  'bottom-left': 'settings.toasts.posBottomLeft',
  'bottom-center': 'settings.toasts.posBottomCenter',
}

const DURATION_LABEL_KEYS = {
  short: 'settings.toasts.durShort',
  normal: 'settings.toasts.durNormal',
  long: 'settings.toasts.durLong',
  persistent: 'settings.toasts.durPersistent',
}

export function getToastPositionOptions() {
  return TOAST_POSITION_IDS.map((id) => ({
    id,
    name: tGlobal(POSITION_LABEL_KEYS[id]),
  }))
}

export function getToastDurationPresetOptions() {
  return TOAST_DURATION_PRESET_IDS.map((id) => ({
    id,
    name: tGlobal(DURATION_LABEL_KEYS[id]),
  }))
}

/** ID-only stubs for consumers that only need option ids. Prefer getToastPositionOptions(). */
export const TOAST_POSITION_OPTIONS = TOAST_POSITION_IDS.map((id) => ({ id, name: id }))

/** ID-only stubs for consumers that only need option ids. Prefer getToastDurationPresetOptions(). */
export const TOAST_DURATION_PRESET_OPTIONS = TOAST_DURATION_PRESET_IDS.map((id) => ({ id, name: id }))

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

  const position = TOAST_POSITION_IDS.includes(raw.position)
    ? raw.position
    : DEFAULT_SETTINGS.position

  const durationPreset = TOAST_DURATION_PRESET_IDS.includes(raw.durationPreset)
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
  const TOAST_POSITION_OPTIONS_I18N = computed(() => getToastPositionOptions())
  const TOAST_DURATION_PRESET_OPTIONS_I18N = computed(() => getToastDurationPresetOptions())

  return {
    settings,
    TOAST_POSITION_OPTIONS: TOAST_POSITION_OPTIONS_I18N,
    TOAST_DURATION_PRESET_OPTIONS: TOAST_DURATION_PRESET_OPTIONS_I18N,
    TOAST_MAX_OPTIONS,
  }
}
