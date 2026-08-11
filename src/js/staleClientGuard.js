/**
 * Централизованная защита от устаревшего клиента после client-build:
 * chunk 404 / dynamic import fail → один reload; повтор → UI;
 * сверка /client-build.json с ERGO_CLIENT_BUILD_ID (не в DEV).
 */

const RELOAD_GATE_KEY = 'ergo_stale_client_reload'
const BUILD_JSON_PATH = '/client-build.json'
const GATE_CLEAR_AFTER_MS = 15000

let recovering = false
let guardsInstalled = false
let buildWatchStarted = false
let gateClearTimer = null

function readReloadGate() {
  if (typeof sessionStorage === 'undefined') {
    return false
  }
  try {
    return sessionStorage.getItem(RELOAD_GATE_KEY) === '1'
  } catch {
    return false
  }
}

function writeReloadGate(on) {
  if (typeof sessionStorage === 'undefined') {
    return
  }
  try {
    if (on) {
      sessionStorage.setItem(RELOAD_GATE_KEY, '1')
    } else {
      sessionStorage.removeItem(RELOAD_GATE_KEY)
    }
  } catch {
    /* private mode */
  }
}

export function clearStaleClientReloadGate() {
  writeReloadGate(false)
  if (gateClearTimer != null) {
    clearTimeout(gateClearTimer)
    gateClearTimer = null
  }
}

function scheduleGateClear() {
  if (gateClearTimer != null) {
    clearTimeout(gateClearTimer)
  }
  gateClearTimer = setTimeout(() => {
    gateClearTimer = null
    writeReloadGate(false)
  }, GATE_CLEAR_AFTER_MS)
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isStaleClientError(error) {
  if (error == null) {
    return false
  }
  if (typeof error === 'string') {
    return isStaleClientError({ message: error })
  }

  const name = String(error.name || '')
  const message = String(error.message || '')
  const code = String(error.code || '')
  const combined = `${name} ${code} ${message}`

  if (name === 'ChunkLoadError' || code === 'CSS_CHUNK_LOAD_FAILED') {
    return true
  }
  if (/CSS_CHUNK_LOAD_FAILED/i.test(combined)) {
    return true
  }
  if (/Failed to fetch dynamically imported module/i.test(combined)) {
    return true
  }
  if (/Loading CSS chunk [\d]+ failed/i.test(combined)) {
    return true
  }
  if (/Loading chunk [\d]+ failed/i.test(combined)) {
    return true
  }
  if (/Importing a module script failed/i.test(combined)) {
    return true
  }
  if (
    /\/assets\//i.test(combined)
    && /404|Failed to fetch|Load failed|error loading|net::ERR/i.test(combined)
  ) {
    return true
  }
  return false
}

async function showStaleFailureUi(error, reason) {
  try {
    const { showBootFailure } = await import('@/js/bootFailure.js')
    await showBootFailure(error ?? new Error(String(reason || 'stale-client')), {
      variant: 'stale',
    })
  } catch {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }
}

/**
 * @param {string} [reason]
 * @returns {boolean} true если запущено восстановление (reload или UI)
 */
export function recoverFromStaleClient(reason = 'unspecified') {
  if (typeof window === 'undefined') {
    return false
  }
  if (recovering) {
    return true
  }
  recovering = true

  void import('@/js/utils/logError.js')
    .then(({ logWarn }) => {
      logWarn('[staleClient] восстановление устаревшего клиента', { reason })
    })
    .catch(() => {})

  if (!readReloadGate()) {
    writeReloadGate(true)
    window.location.reload()
    return true
  }

  writeReloadGate(false)
  void showStaleFailureUi(null, reason).finally(() => {
    recovering = false
  })
  return true
}

function getEmbeddedBuildId() {
  try {
    const id = import.meta.env.ERGO_CLIENT_BUILD_ID
    return typeof id === 'string' && id ? id : ''
  } catch {
    return ''
  }
}

/**
 * Сверка с /client-build.json. В DEV не вызывается.
 * @returns {Promise<void>}
 */
export async function checkClientBuildId(reason = 'build-id') {
  if (import.meta.env.DEV || typeof fetch === 'undefined') {
    return
  }
  const embedded = getEmbeddedBuildId()
  if (!embedded) {
    return
  }
  try {
    const response = await fetch(BUILD_JSON_PATH, {
      cache: 'no-store',
      credentials: 'same-origin',
    })
    if (!response.ok) {
      return
    }
    const data = await response.json()
    const remote = data && typeof data.buildId === 'string' ? data.buildId : ''
    if (!remote || remote === embedded) {
      scheduleGateClear()
      return
    }
    recoverFromStaleClient(reason)
  } catch {
    /* сеть / нет файла — не считаем mismatch */
  }
}

function onVisibilityBuildCheck() {
  if (typeof document === 'undefined') {
    return
  }
  if (document.visibilityState === 'visible') {
    void checkClientBuildId('build-id-visibility')
  }
}

export function startClientBuildIdWatch() {
  if (import.meta.env.DEV || buildWatchStarted || typeof window === 'undefined') {
    return
  }
  buildWatchStarted = true
  void checkClientBuildId('build-id-boot')
  document.addEventListener('visibilitychange', onVisibilityBuildCheck)
}

/**
 * @param {{ router?: import('vue-router').Router, app?: import('vue').App }} [options]
 */
export function installStaleClientGuards(options = {}) {
  const { router, app } = options

  if (!guardsInstalled && typeof window !== 'undefined') {
    guardsInstalled = true

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason
      if (!isStaleClientError(reason)) {
        return
      }
      event.preventDefault?.()
      recoverFromStaleClient('unhandledrejection')
    })
  }

  if (router && typeof router.onError === 'function') {
    router.onError((error) => {
      if (isStaleClientError(error)) {
        recoverFromStaleClient('router.onError')
      }
    })
  }

  if (app?.config) {
    const previous = app.config.errorHandler
    app.config.errorHandler = (err, instance, info) => {
      if (isStaleClientError(err)) {
        recoverFromStaleClient('vue.errorHandler')
        return
      }
      if (typeof previous === 'function') {
        previous(err, instance, info)
      }
    }
  }

  startClientBuildIdWatch()
  scheduleGateClear()
}
