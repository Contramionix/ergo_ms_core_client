/**
 * Динамический CSS без inline <style> — совместимо с CSP style-src 'self'
 * (ERGO_SECURITY hardened/maximum, API_CSP_MODE no_unsafe*).
 *
 * Использует Constructable Stylesheets + document.adoptedStyleSheets.
 * Реестр на window — общий для classic bootstrap-early.js и ES-модулей.
 */

const REGISTRY_KEY = '__ERGO_CSP_STYLE_SHEETS__'

function getRegistry() {
  if (typeof window === 'undefined') {
    return null
  }
  if (!window[REGISTRY_KEY]) {
    window[REGISTRY_KEY] = Object.create(null)
  }
  return window[REGISTRY_KEY]
}

function supportsAdoptedStyleSheets() {
  return (
    typeof CSSStyleSheet !== 'undefined' &&
    typeof document !== 'undefined' &&
    'adoptedStyleSheets' in document
  )
}

function removeLegacyStyleElement(id) {
  if (typeof document === 'undefined' || !id) {
    return
  }
  const legacy = document.getElementById(id)
  if (legacy && legacy.tagName === 'STYLE') {
    legacy.remove()
  }
}

/**
 * Записать CSS в именованный sheet (пустая строка очищает правила).
 * @param {string} id — стабильный ключ (например custom-theme-styles)
 * @param {string} cssText
 */
export function setCspStyleSheet(id, cssText) {
  if (!id || typeof document === 'undefined') {
    return
  }

  removeLegacyStyleElement(id)

  const text = typeof cssText === 'string' ? cssText : ''

  if (supportsAdoptedStyleSheets()) {
    const registry = getRegistry()
    let sheet = registry[id]
    if (!sheet) {
      sheet = new CSSStyleSheet()
      registry[id] = sheet
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
    }
    sheet.replaceSync(text)
    return
  }

  // Запасной путь для браузеров без adoptedStyleSheets (под strict CSP всё равно блокируется).
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('style')
    el.id = id
    const parent = document.head || document.documentElement
    parent.appendChild(el)
  }
  el.textContent = text
}

/**
 * Очистить правила именованного sheet (сам sheet остаётся в adoptedStyleSheets).
 * @param {string} id
 */
export function clearCspStyleSheet(id) {
  setCspStyleSheet(id, '')
}
