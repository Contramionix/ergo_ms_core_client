import { useUserStore } from '@/core/cms/js/userStore.js'
import { isServerLogoutFinalized, restoreSession } from '@/core/cms/js/tokenRefresh.js'
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
      const { router } = await import('@/js/routers.js')
      const current = router?.currentRoute?.value
      const onLoginShell = current?.name === 'Login' || current?.name === 'StartPage'
      if (onLoginShell && userStore.isAuthenticated && !isServerLogoutFinalized()) {
        const { consumePostLoginReturnPath } = await import('@/core/cms/js/postLoginReturn.js')
        const returnPath = consumePostLoginReturnPath()
        await router.replace(returnPath || { name: 'AppHome' }).catch(() => {})
      }
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
