// side-effect: registerSessionBootstrap
import '@/js/bootstrapSession.js'
import {
  bootstrapping,
  bootstrapError,
  whenSessionReady,
} from '@/js/sessionReady.js'

export function useAppBootstrap() {
  // Скелетон меню смотрит только на одноразовый bootstrap сессии.
  // userStore.isLoading сюда нельзя: MenuList.ensureUserReady ставит isLoading,
  // скелетон размонтирует меню, onMounted повторяется → шторм 401 и toast.
  return {
    bootstrapping,
    bootstrapError,
    whenSessionReady,
  }
}
