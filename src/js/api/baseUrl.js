/**
 * Базовый URL API-сервера (без суффикса api/).
 */
export function resolveApiBaseUrl() {
  if (import.meta.env.VITE_USE_RELATIVE_API === 'true') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/`
    }
    return '/'
  }
  const host = import.meta.env.VITE_API_HOST || 'localhost'
  const port = import.meta.env.VITE_API_PORT || '8000'
  return `http://${host}:${port}/`
}

export function resolveApiClientBaseUrl() {
  const base = resolveApiBaseUrl()
  return base ? `${base}api/` : '/api/'
}

/**
 * Абсолютный URL WebSocket (через nginx/VITE_USE_RELATIVE_API — тот же origin, что и SPA).
 */
export function buildWebSocketUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const protocol =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  if (import.meta.env.VITE_USE_RELATIVE_API === 'true') {
    if (typeof window !== 'undefined' && window.location?.host) {
      return `${protocol}//${window.location.host}${normalizedPath}`
    }
    const host = import.meta.env.VITE_API_HOST || 'localhost'
    const port = import.meta.env.VITE_API_PORT || (protocol === 'wss:' ? '443' : '80')
    return `${protocol}//${host}:${port}${normalizedPath}`
  }

  const host = import.meta.env.VITE_API_HOST || 'localhost'
  const port = import.meta.env.VITE_API_PORT || '8000'
  return `${protocol}//${host}:${port}${normalizedPath}`
}
