/**
 * Единый разбор тела ошибки DRF/axios для UI, toast и логов.
 */

import { tGlobal } from '@/i18n/index.js'

function defaultFallback() {
  return tGlobal('errors.api.tryLater')
}

/**
 * @param {unknown} data — error.response.data или plain object
 * @param {{ fallback?: string, mode?: 'first' | 'join' }} [options]
 * @returns {string}
 */
export function parseApiErrorData(data, options = {}) {
  const fallback = options.fallback ?? defaultFallback()
  const mode = options.mode ?? 'first'

  if (data == null) {
    return fallback
  }
  if (typeof data === 'string') {
    return data
  }
  if (typeof data !== 'object') {
    return String(data)
  }

  const directKeys = ['error', 'message', 'detail', 'non_field_errors']
  for (const key of directKeys) {
    const value = data[key]
    if (value == null) {
      continue
    }
    if (typeof value === 'string') {
      return value
    }
    if (Array.isArray(value) && value.length) {
      return String(value[0])
    }
  }

  const entries = Object.entries(data)
  if (!entries.length) {
    return fallback
  }

  if (mode === 'join') {
    return entries
      .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
      .map((item) => (item == null ? '' : String(item)))
      .filter(Boolean)
      .join(', ') || fallback
  }

  const [, firstValue] = entries[0]
  if (Array.isArray(firstValue) && firstValue.length) {
    return String(firstValue[0])
  }
  if (typeof firstValue === 'string') {
    return firstValue
  }

  return fallback
}

/**
 * @param {unknown} error — axios error или объект с response.data
 * @param {string} [fallback]
 * @returns {string}
 */
export function extractApiError(error, fallback) {
  const status = error?.response?.status
  if (status === 429) {
    return tGlobal('errors.api.tooManyRequests')
  }
  if (status === 413) {
    return tGlobal('errors.api.payloadTooLarge')
  }
  if (status === 502 || status === 503 || status === 504) {
    const data = error?.response?.data
    const detail = typeof data === 'object' && data ? data.detail : data
    const header = error?.response?.headers?.['x-ergo-module-unavailable']
    if (header || detail === 'module_unavailable') {
      return tGlobal('errors.api.moduleUnavailable')
    }
  }
  return parseApiErrorData(error?.response?.data ?? error, {
    fallback: fallback ?? defaultFallback(),
    mode: 'first',
  })
}
