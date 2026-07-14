/**
 * МАСКА ЗАГРУЗКИ ПРИЛОЖЕНИЯ
 *
 * Класс `app-bootstrapping` на <html> делает #app прозрачным (см. критический инлайн-CSS
 * в index.html и bootstrap-early.js) и отключает переходы. Inline-loader `#ergo-boot-loader`
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

/** @type {ReturnType<typeof setTimeout>|null} */
let safetyTimer = null

function getLoaderElement() {
  if (typeof document === 'undefined') {
    return null
  }
  return document.getElementById(LOADER_ID)
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
  document.documentElement.classList.remove(BOOTSTRAP_CLASS)
  hideBootLoader()
  clearSafetyTimeout()
}
