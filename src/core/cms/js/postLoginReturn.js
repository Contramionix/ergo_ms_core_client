import Cookies from 'js-cookie'

const COOKIE_NAME = 'ergo_return_path'
const MAX_PATH_LENGTH = 2048
const COOKIE_DAYS = 1

const AUTH_PATH_PREFIXES = [
  '/login',
  '/start-page',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/logout',
]

/**
 * Относительный путь приложения без open-redirect.
 * @param {unknown} path
 * @returns {boolean}
 */
export function isSafePostLoginReturnPath(path) {
  if (typeof path !== 'string' || !path) {
    return false
  }
  if (path.length > MAX_PATH_LENGTH) {
    return false
  }
  if (!path.startsWith('/') || path.startsWith('//')) {
    return false
  }
  if (path.includes('://') || path.includes('\\')) {
    return false
  }
  const pathname = path.split(/[?#]/)[0] || ''
  return !AUTH_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function currentLocationPath() {
  if (typeof window === 'undefined' || !window.location) {
    return null
  }
  return `${window.location.pathname || ''}${window.location.search || ''}${window.location.hash || ''}`
}

/**
 * Сохранить путь для возврата после повторного входа (принудительный выход).
 * @param {string} [fullPath]
 */
export function savePostLoginReturnPath(fullPath) {
  const path = typeof fullPath === 'string' && fullPath
    ? fullPath
    : currentLocationPath()
  if (!isSafePostLoginReturnPath(path)) {
    return
  }
  try {
    Cookies.set(COOKIE_NAME, path, {
      expires: COOKIE_DAYS,
      path: '/',
      sameSite: 'Lax',
    })
  } catch {
    // ignore
  }
}

export function clearPostLoginReturnPath() {
  try {
    Cookies.remove(COOKIE_NAME, { path: '/' })
  } catch {
    // ignore
  }
}

/**
 * Прочитать и удалить сохранённый путь.
 * @returns {string|null}
 */
export function consumePostLoginReturnPath() {
  let raw = null
  try {
    raw = Cookies.get(COOKIE_NAME) || null
  } catch {
    raw = null
  }
  clearPostLoginReturnPath()
  if (!isSafePostLoginReturnPath(raw)) {
    return null
  }
  return raw
}
