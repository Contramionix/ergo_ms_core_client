import { ref } from 'vue'

/** @type {import('vue').Ref<boolean>} */
export const bootstrapping = ref(false)

/** @type {import('vue').Ref<unknown|null>} */
export const bootstrapError = ref(null)

/** @type {Promise<void>|null} */
let bootstrapPromise = null

/** @type {null | (() => Promise<void>)} */
let runBootstrap = null

/**
 * Регистрация реализации bootstrap (из bootstrapSession.js).
 * Вынесено отдельно, чтобы guards/API ждали сессию без цикла
 * sessionReady → userStore → accessControl → adminAccessApi.
 */
export function registerSessionBootstrap(fn) {
  runBootstrap = fn
}

/**
 * Идемпотентный bootstrap сессии.
 * @returns {Promise<void>}
 */
export function bootstrapAppSession() {
  if (bootstrapPromise) {
    return bootstrapPromise
  }
  if (typeof runBootstrap !== 'function') {
    return Promise.resolve()
  }
  bootstrapPromise = runBootstrap()
  return bootstrapPromise
}

/**
 * @returns {Promise<void>}
 */
export function whenSessionReady() {
  return bootstrapAppSession()
}
