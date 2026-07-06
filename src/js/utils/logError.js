import { parseApiErrorData } from '@/js/utils/apiErrorMessage.js'

const SENSITIVE_KEYS = new Set([
  'password',
  'password_confirm',
  'current_password',
  'new_password',
  'old_password',
  'token',
  'access',
  'refresh',
  'authorization',
  'secret',
  'api_key',
  'apikey',
])

const MAX_MESSAGE_LENGTH = 500

function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') {
    return false
  }
  const lower = key.toLowerCase()
  return (
    SENSITIVE_KEYS.has(lower)
    || lower.includes('password')
    || lower.includes('token')
    || lower.includes('secret')
  )
}

function truncate(value, max = MAX_MESSAGE_LENGTH) {
  if (typeof value !== 'string') {
    return value
  }
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function extractMessageFromData(data) {
  if (data == null) {
    return null
  }
  if (typeof data === 'string') {
    return truncate(data)
  }
  if (typeof data !== 'object') {
    return String(data)
  }

  const directMessage = parseApiErrorData(data, { fallback: '', mode: 'first' })
  if (directMessage) {
    return truncate(directMessage)
  }

  const fieldMessages = []
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      fieldMessages.push(`${key}: [скрыто]`)
      continue
    }
    if (typeof value === 'string') {
      fieldMessages.push(`${key}: ${value}`)
    } else if (Array.isArray(value) && value.length) {
      fieldMessages.push(`${key}: ${value[0]}`)
    }
  }

  if (fieldMessages.length) {
    return truncate(fieldMessages.join('; '))
  }

  return null
}

/**
 * Извлекает безопасное для логирования описание ошибки (без config/headers/body).
 */
export function sanitizeError(error) {
  if (error == null) {
    return { status: undefined, statusText: undefined, message: 'Неизвестная ошибка' }
  }

  if (typeof error === 'string') {
    return { status: undefined, statusText: undefined, message: truncate(error) }
  }

  if (typeof error === 'object' && error !== null && !Array.isArray(error) && !error.response) {
    const plainMessage =
      extractMessageFromData(error)
      || (typeof error.message === 'string' ? truncate(error.message) : null)
    if (plainMessage) {
      return {
        status: typeof error.status === 'number' ? error.status : undefined,
        statusText: undefined,
        message: plainMessage,
      }
    }
  }

  const response = error.response
  const status = response?.status
  const statusText = response?.statusText
  const message =
    extractMessageFromData(response?.data)
    || (typeof error.message === 'string' ? truncate(error.message) : null)
    || 'Ошибка сервера'

  return { status, statusText, message }
}

function formatStatus(status, statusText) {
  if (status == null) {
    return '[no response]'
  }
  return `[${status}${statusText ? ` ${statusText}` : ''}]`
}

function writeLog(level, context, error, options = {}) {
  const writer = level === 'warn' ? console.warn : console.error

  if (error === undefined) {
    if (typeof context === 'string') {
      writer(`${context} [no response]:`, context)
      return
    }

    const sanitized = sanitizeError(context)
    const label = level === 'warn' ? 'Предупреждение' : 'Ошибка'
    writer(`${label} ${formatStatus(sanitized.status, sanitized.statusText)}:`, sanitized.message)
    return
  }

  const { status, statusText, message } = sanitizeError(error)
  const prefix = options.endpoint ? `${context} (${options.endpoint})` : context
  writer(`${prefix} ${formatStatus(status, statusText)}:`, message)
}

/**
 * Безопасное логирование ошибки: контекст, HTTP status и сообщение.
 * Не логирует headers, config, request body и stack trace.
 *
 * Допустимые формы:
 *   logError('Контекст', error)
 *   logError(error)           — контекст по умолчанию «Ошибка»
 *   logError('Текст ошибки')  — без объекта ошибки
 */
export function logError(context, error, options = {}) {
  writeLog('error', context, error, options)
}

/**
 * Безопасное логирование предупреждения с теми же правилами санитизации.
 */
export function logWarn(context, error, options = {}) {
  writeLog('warn', context, error, options)
}

export default logError
