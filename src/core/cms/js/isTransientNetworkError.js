/**
 * Сетевой/временный сбой API (отказ соединения, таймаут, 502–504),
 * а не отказ в аутентификации.
 */
export function isTransientNetworkError(error) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const status = error.response?.status
  if (status === 502 || status === 503 || status === 504) {
    return true
  }

  if (error.response) {
    return false
  }

  const code = error.code
  if (
    code === 'ERR_NETWORK'
    || code === 'ECONNABORTED'
    || code === 'ERR_CANCELED'
    || code === 'ECONNREFUSED'
  ) {
    return true
  }

  const message = typeof error.message === 'string' ? error.message : ''
  if (/network error|connection refused|failed to fetch|load failed/i.test(message)) {
    return true
  }

  // Axios без response: запрос ушёл, ответа нет
  if (error.isAxiosError || error.request) {
    return true
  }

  return false
}
