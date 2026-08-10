/**
 * МАСКА ЗАГРУЗКИ ПРИЛОЖЕНИЯ
 *
 * Класс `app-bootstrapping` на <html> делает #app прозрачным (см. /css/boot-loader.css
 * и bootstrap-early.js) и отключает переходы. Loader `#ergo-boot-loader`
 * показывается вместо белого экрана.
 *
 * Используется:
 *  - при первичной загрузке/перезагрузке (класс ставится в bootstrap-early.js до бандла,
 *    снимается в App.vue после готовности роутера и отрисовки layout);
 *  - при выходе из аккаунта перед сбросом состояния и переходом на страницу входа.
 */

const BOOTSTRAP_CLASS = 'app-bootstrapping'
const LOADER_ID = 'ergo-boot-loader'
const SAFETY_TIMEOUT_MS = 8000
/** Виджеты с infinite CSS-animation (typing-dots) слушают это после F5. */
export const BOOTSTRAP_MASK_HIDDEN_EVENT = 'ergo:bootstrap-mask-hidden'

/** @type {ReturnType<typeof setTimeout>|null} */
let safetyTimer = null

function getLoaderElement() {
  if (typeof document === 'undefined') {
    return null
  }
  return document.getElementById(LOADER_ID)
}

export function isBootstrapMaskActive() {
  if (typeof document === 'undefined') {
    return false
  }
  return document.documentElement.classList.contains(BOOTSTRAP_CLASS)
}

function showBootLoader() {
  const loader = getLoaderElement()
  if (loader) {
    loader.hidden = false
    loader.setAttribute('aria-busy', 'true')
  }
}

function hideBootLoader() {
  const loader = getLoaderElement()
  if (loader) {
    loader.hidden = true
    loader.setAttribute('aria-busy', 'false')
  }
}

function clearSafetyTimeout() {
  if (safetyTimer) {
    clearTimeout(safetyTimer)
    safetyTimer = null
  }
}

function resetSafetyTimeout() {
  clearSafetyTimeout()
  safetyTimer = setTimeout(() => {
    hideBootstrapMask()
  }, SAFETY_TIMEOUT_MS)
}

export function showBootstrapMask() {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.classList.add(BOOTSTRAP_CLASS)
  showBootLoader()
  resetSafetyTimeout()
}

export function hideBootstrapMask() {
  if (typeof document === 'undefined') {
    return
  }
  const wasActive = document.documentElement.classList.contains(BOOTSTRAP_CLASS)
  document.documentElement.classList.remove(BOOTSTRAP_CLASS)
  hideBootLoader()
  clearSafetyTimeout()
  if (wasActive && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOTSTRAP_MASK_HIDDEN_EVENT))
  }
}
