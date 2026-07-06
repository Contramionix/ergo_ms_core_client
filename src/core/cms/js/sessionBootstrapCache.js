/**
 * Кэш ответа session-bootstrap для повторного использования без лишних запросов.
 */

/** @type {object|null} */
let bootstrapCache = null

export function getSessionBootstrapCache() {
  return bootstrapCache
}

export function setSessionBootstrapCache(data) {
  bootstrapCache = data && typeof data === 'object' ? data : null
}

export function clearSessionBootstrapCache() {
  bootstrapCache = null
}
