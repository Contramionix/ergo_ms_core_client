import ErgoToastBody from '@/components/ErgoToastBody.vue'
import {
  createToastInterface,
  globalEventBus,
  useToast as useVueToast,
} from 'vue-toastification'

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
  return {
    position: 'top-right',
    maxToasts: 4,
    timeout: TOAST_TIMEOUT.default,
    draggable: true,
    pauseOnHover: true,
    closeOnClick: false,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    shareAppContext: true,
    filterBeforeCreate: createToastFilterBeforeCreate(),
    toastDefaults: {
      success: { timeout: TOAST_TIMEOUT.success },
      error: { timeout: TOAST_TIMEOUT.error },
      warning: { timeout: TOAST_TIMEOUT.warning },
      info: { timeout: TOAST_TIMEOUT.info },
    },
  }
}

function mergeOptions(type, options = {}) {
  const normalizedType = mapToastType(type)
  return {
    type: normalizedType,
    timeout: TOAST_TIMEOUT[normalizedType] ?? TOAST_TIMEOUT.default,
    ...options,
  }
}

export function wrapToastInterface(rawToast) {
  if (!rawToast) {
    return rawToast
  }

  const show = (message, options = {}) => rawToast(normalizeToastMessage(message), options)

  const wrapped = (message, options = {}) => show(message, options)

  wrapped.clear = rawToast.clear.bind(rawToast)
  wrapped.dismiss = rawToast.dismiss.bind(rawToast)
  wrapped.update = rawToast.update.bind(rawToast)
  wrapped.updateDefaults = rawToast.updateDefaults.bind(rawToast)

  wrapped.success = (message, options = {}) =>
    rawToast.success(normalizeToastMessage(message), mergeOptions('success', options))

  wrapped.error = (message, options = {}) =>
    rawToast.error(normalizeToastMessage(message), mergeOptions('error', options))

  wrapped.warning = (message, options = {}) =>
    rawToast.warning(normalizeToastMessage(message), mergeOptions('warning', options))

  wrapped.info = (message, options = {}) =>
    rawToast.info(normalizeToastMessage(message), mergeOptions('info', options))

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

export function showSuccess(message, duration = TOAST_TIMEOUT.success) {
  return getToast().success(message, { timeout: duration })
}

export function showError(message, duration = TOAST_TIMEOUT.error) {
  return getToast().error(message, { timeout: duration })
}

export function showWarning(message, duration = TOAST_TIMEOUT.warning) {
  return getToast().warning(message, { timeout: duration })
}

export function showInfo(message, duration = TOAST_TIMEOUT.info) {
  return getToast().info(message, { timeout: duration })
}

export function showToast(message, type = 'info', duration) {
  const normalizedType = mapToastType(type)
  const timeout = duration ?? TOAST_TIMEOUT[normalizedType] ?? TOAST_TIMEOUT.default
  const toast = getToast()

  if (typeof toast[normalizedType] === 'function') {
    return toast[normalizedType](message, { timeout })
  }

  return toast(message, mergeOptions(normalizedType, { timeout }))
}

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
