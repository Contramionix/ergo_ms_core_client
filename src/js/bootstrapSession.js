import { ref } from 'vue'

import { useUserStore } from '@/core/cms/js/userStore.js'
import { restoreSession } from '@/core/cms/js/tokenRefresh.js'
import { getAccess } from '@/core/cms/js/tokenStorage.js'
import { logError } from '@/js/utils/logError.js'

/** @type {import('vue').Ref<boolean>} */
export const bootstrapping = ref(false)

/** @type {import('vue').Ref<unknown|null>} */
export const bootstrapError = ref(null)

/** @type {Promise<void>|null} */
let bootstrapPromise = null

/**
 * Идемпотентный bootstrap сессии: restoreSession → session-bootstrap при успехе.
 * Не бросает исключения — ошибки логируются, гость обрабатывается guards.
 *
 * @returns {Promise<void>}
 */
export function bootstrapAppSession() {
  if (bootstrapPromise) {
    return bootstrapPromise
  }

  bootstrapPromise = (async () => {
    bootstrapping.value = true
    bootstrapError.value = null

    try {
      const userStore = useUserStore()
      const hasSession = await restoreSession()
      if (hasSession) {
        await userStore.loadSessionBootstrap()
      }
    } catch (error) {
      bootstrapError.value = error
      logError('Ошибка bootstrap сессии:', error)
    } finally {
      bootstrapping.value = false
      if (getAccess()) {
        const { authGuard } = await import('@/core/cms/js/authGuard.js')
        authGuard.startTokenValidation()
      }
    }
  })()

  return bootstrapPromise
}

/**
 * @returns {Promise<void>}
 */
export function whenSessionReady() {
  return bootstrapAppSession()
}
