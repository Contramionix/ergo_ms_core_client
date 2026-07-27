import { useUserStore } from '@/core/cms/js/userStore.js'
import { restoreSession } from '@/core/cms/js/tokenRefresh.js'
import { getAccess } from '@/core/cms/js/tokenStorage.js'
import { logError } from '@/js/utils/logError.js'
import {
  bootstrapping,
  bootstrapError,
  bootstrapAppSession,
  registerSessionBootstrap,
  whenSessionReady,
} from '@/js/sessionReady.js'

registerSessionBootstrap(async () => {
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
})

export {
  bootstrapping,
  bootstrapError,
  bootstrapAppSession,
  whenSessionReady,
}
