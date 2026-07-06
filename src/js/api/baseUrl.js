import { clientEnv } from '@/js/clientEnv.js'

/**
 * Базовый URL API-сервера (без суффикса api/).
 */
export function resolveApiBaseUrl() {
  if (clientEnv.useRelativeApi) {
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
 * Абсолютный URL WebSocket (при CLIENT_USE_RELATIVE_API — тот же origin, что и SPA).
 */
export function buildWebSocketUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  if (clientEnv.useRelativeApi) {
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
