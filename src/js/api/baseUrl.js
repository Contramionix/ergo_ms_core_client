import { clientEnv } from '@/js/clientEnv.js'

function normalizeOrigin(value) {
  if (!value) {
    return ''
  }
  try {
    const url = new URL(value.includes('://') ? value : `http://${value}`)
    const host = url.hostname === '127.0.0.1' ? 'localhost' : url.hostname
    const port = url.port || (url.protocol === 'https:' ? '443' : '80')
    return `${url.protocol}//${host}:${port}`
  } catch {
    return String(value).replace(/\/$/, '')
  }
}

function configuredDirectApiOrigin() {
  return normalizeOrigin(`http://${clientEnv.apiHost}:${clientEnv.apiPort}`)
}

/**
 * Запросы к API через тот же origin, что и SPA (nginx проксирует /api/).
 * Нужно для CSP connect-src 'self' и reverse proxy.
 */
export function shouldUseSameOriginApi() {
  if (clientEnv.useRelativeApi) {
    return true
  }
  if (typeof window === 'undefined' || !window.location?.origin) {
    return false
  }
  return normalizeOrigin(window.location.origin) !== configuredDirectApiOrigin()
}

/**
 * Базовый URL API-сервера (без суффикса api/).
 */
export function resolveApiBaseUrl() {
  if (shouldUseSameOriginApi()) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/`
    }
    return '/'
  }
  const host = clientEnv.apiHost
  const port = clientEnv.apiPort
  return `http://${host}:${port}/`
}

export function resolveApiClientBaseUrl() {
  const base = resolveApiBaseUrl()
  return base ? `${base}api/` : '/api/'
}

/**
 * Абсолютный URL WebSocket (при same-origin API — тот же host, что и SPA).
 */
export function buildWebSocketUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  if (shouldUseSameOriginApi()) {
    if (typeof window !== 'undefined' && window.location?.host) {
      return `${protocol}//${window.location.host}${normalizedPath}`
    }
    const host = clientEnv.apiHost
    const port = clientEnv.apiPort || (protocol === 'wss:' ? '443' : '80')
    return `${protocol}//${host}:${port}${normalizedPath}`
  }

  const host = clientEnv.apiHost
  const port = clientEnv.apiPort
  return `${protocol}//${host}:${port}${normalizedPath}`
}
