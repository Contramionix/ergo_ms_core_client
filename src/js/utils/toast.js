import ErgoToastBody from '@/components/ErgoToastBody.vue'
import {
  createToastInterface,
  globalEventBus,
  useToast as useVueToast,
} from 'vue-toastification'
import {
  getToastSettingsSnapshot,
  getToastTimeouts,
  isToastEnabled,
  subscribeToastSettingsChange,
} from '@/js/utils/toastSettings.js'

export const TOAST_TIMEOUT = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
  default: 3000,
}

const TYPE_ALIASES = {
  primary: 'info',
  danger: 'error',
}

export function normalizeToastMessage(message, fallback = 'Произошла ошибка') {
  if (message == null || message === '') {
    return fallback
  }

  if (typeof message === 'string') {
    return message
  }

  if (typeof message === 'number' || typeof message === 'boolean') {
    return String(message)
  }

  if (Array.isArray(message)) {
    return message.map((item) => normalizeToastMessage(item, '')).filter(Boolean).join(', ') || fallback
  }

  if (typeof message === 'object') {
    if (typeof message.message === 'string') {
      return message.message
    }
    if (typeof message.detail === 'string') {
      return message.detail
    }
    if (typeof message.error === 'string') {
      return message.error
    }
  }

  return fallback
}

function mapToastType(type) {
  if (!type) {
    return 'info'
  }
  return TYPE_ALIASES[type] || type
}

function isCustomToastContent(content) {
  return content && typeof content === 'object' && (content.component || content.render)
}

export function createToastFilterBeforeCreate() {
  return (toast) => {
    if (isCustomToastContent(toast.content) || typeof toast.content === 'function') {
      return toast
    }

    const type = mapToastType(toast.type)

    return {
      ...toast,
      type,
      icon: false,
      closeButton: false,
      toastClassName: ['ergo-toast', `ergo-toast--${type}`],
      bodyClassName: 'ergo-toast__body',
      content: {
        component: ErgoToastBody,
        props: {
          message: normalizeToastMessage(toast.content),
          type,
        },
      },
    }
  }
}

export function getToastPluginOptions() {
  const snapshot = getToastSettingsSnapshot()
  const timeouts = getToastTimeouts(snapshot.durationPreset)

  return {
    position: snapshot.position,
    maxToasts: snapshot.maxToasts,
    timeout: timeouts.default,
    draggable: snapshot.draggable,
    pauseOnHover: snapshot.pauseOnHover,
    closeOnClick: false,
    showCloseButtonOnHover: false,
    hideProgressBar: snapshot.hideProgressBar,
    shareAppContext: true,
    filterBeforeCreate: createToastFilterBeforeCreate(),
    toastDefaults: {
      success: { timeout: timeouts.success },
      error: { timeout: timeouts.error },
      warning: { timeout: timeouts.warning },
      info: { timeout: timeouts.info },
    },
  }
}

export function syncToastPluginWithSettings() {
  const snapshot = getToastSettingsSnapshot()
  const timeouts = getToastTimeouts(snapshot.durationPreset)

  getToast().updateDefaults({
    position: snapshot.position,
    maxToasts: snapshot.maxToasts,
    timeout: timeouts.default,
    draggable: snapshot.draggable,
    pauseOnHover: snapshot.pauseOnHover,
    hideProgressBar: snapshot.hideProgressBar,
    toastDefaults: {
      success: { timeout: timeouts.success },
      error: { timeout: timeouts.error },
      warning: { timeout: timeouts.warning },
      info: { timeout: timeouts.info },
    },
  })
}

function mergeOptions(type, options = {}) {
  const normalizedType = mapToastType(type)
  const timeouts = getToastTimeouts()
  return {
    type: normalizedType,
    timeout: timeouts[normalizedType] ?? timeouts.default ?? TOAST_TIMEOUT.default,
    ...options,
  }
}

export function wrapToastInterface(rawToast) {
  if (!rawToast) {
    return rawToast
  }

  const show = (message, options = {}) => {
    if (!isToastEnabled()) {
      return undefined
    }
    return rawToast(normalizeToastMessage(message), options)
  }

  const wrapped = (message, options = {}) => show(message, options)

  wrapped.clear = rawToast.clear.bind(rawToast)
  wrapped.dismiss = rawToast.dismiss.bind(rawToast)
  wrapped.update = rawToast.update.bind(rawToast)
  wrapped.updateDefaults = rawToast.updateDefaults.bind(rawToast)

  wrapped.success = (message, options = {}) => {
    if (!isToastEnabled()) {
      return undefined
    }
    return rawToast.success(normalizeToastMessage(message), mergeOptions('success', options))
  }

  wrapped.error = (message, options = {}) => {
    if (!isToastEnabled()) {
      return undefined
    }
    return rawToast.error(normalizeToastMessage(message), mergeOptions('error', options))
  }

  wrapped.warning = (message, options = {}) => {
    if (!isToastEnabled()) {
      return undefined
    }
    return rawToast.warning(normalizeToastMessage(message), mergeOptions('warning', options))
  }

  wrapped.info = (message, options = {}) => {
    if (!isToastEnabled()) {
      return undefined
    }
    return rawToast.info(normalizeToastMessage(message), mergeOptions('info', options))
  }

  return wrapped
}

let globalToastInstance

export function getToast() {
  if (!globalToastInstance) {
    globalToastInstance = wrapToastInterface(createToastInterface(globalEventBus))
  }
  return globalToastInstance
}

export function useToast() {
  return wrapToastInterface(useVueToast())
}

export function showSuccess(message, duration) {
  const timeouts = getToastTimeouts()
  return getToast().success(message, { timeout: duration ?? timeouts.success })
}

export function showError(message, duration) {
  const timeouts = getToastTimeouts()
  return getToast().error(message, { timeout: duration ?? timeouts.error })
}

export function showWarning(message, duration) {
  const timeouts = getToastTimeouts()
  return getToast().warning(message, { timeout: duration ?? timeouts.warning })
}

export function showInfo(message, duration) {
  const timeouts = getToastTimeouts()
  return getToast().info(message, { timeout: duration ?? timeouts.info })
}

export function showToast(message, type = 'info', duration) {
  if (!isToastEnabled()) {
    return undefined
  }

  const normalizedType = mapToastType(type)
  const timeouts = getToastTimeouts()
  const timeout = duration ?? timeouts[normalizedType] ?? timeouts.default ?? TOAST_TIMEOUT.default
  const toast = getToast()

  if (typeof toast[normalizedType] === 'function') {
    return toast[normalizedType](message, { timeout })
  }

  return toast(message, mergeOptions(normalizedType, { timeout }))
}

subscribeToastSettingsChange(() => {
  syncToastPluginWithSettings()
})

export async function handleApiError(error, defaultMessage = 'Произошла ошибка') {
  const errorMessage =
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.response?.data?.detail ||
    (typeof error?.response?.data === 'object'
      ? Object.values(error.response.data).flat().join(', ')
      : defaultMessage)

  showError(normalizeToastMessage(errorMessage, defaultMessage))
}

export function showValidationError(message = 'Проверьте правильность заполнения полей') {
  showWarning(message)
}

export function showSaveSuccess(itemType = 'данные') {
  showSuccess(`${itemType} успешно сохранены!`)
}

export function showDeleteSuccess(itemType = 'элемент') {
  showSuccess(`${itemType} успешно удален!`)
}
