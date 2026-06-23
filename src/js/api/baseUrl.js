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
