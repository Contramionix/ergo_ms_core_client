/**
 * Проверяет, что URL безопасен для использования в href/img src (только http/https).
 * Защита от XSS через javascript:, data: и т.п.
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export function isSafeHref(url) {
  if (url == null || typeof url !== 'string') return false
  const t = url.trim().toLowerCase()
  return t === '' ? false : (t.startsWith('https://') || t.startsWith('http://'))
}

/**
 * Возвращает URL для href/src, если он безопасен (http/https), иначе null.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function getSafeHref(url) {
  return isSafeHref(url) ? url.trim() : null
}
