import { clientEnv } from '@/js/clientEnv.js'

/**
 * Запросы к API через тот же origin, что и SPA (nginx проксирует /api/ и /ws/).
 * Включается при ERGO_PROXY=nginx (или NGINX_ENABLED); явный CLIENT_USE_RELATIVE_API перекрывает.
 *
 * Не сравниваем порты SPA и API: в dev (Vite :8001, API :8000) это ломало WebSocket
 * и гоняло весь трафик через прокси Vite без гарантии, что API уже слушает порт.
 */
export function shouldUseSameOriginApi() {
  return clientEnv.useRelativeApi
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
 * Абсолютный URL WebSocket.
 * same-origin (nginx) — host страницы; иначе — API_HOST:API_PORT напрямую (dev без nginx).
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
