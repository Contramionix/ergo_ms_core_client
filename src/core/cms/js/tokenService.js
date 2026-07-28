import { performTokenRefresh } from '@/core/cms/js/tokenRefresh.js'
import {
  clearTokens,
  getAccess,
  getSessionClaim,
  getUserId,
  hasActiveSessionScope,
  setTokens,
  shouldRefresh,
} from '@/core/cms/js/tokenStorage.js'
import bridge from '@/integrations/ModuleBridge.js'
import { CORE_AUTH_CLEAR_LEGACY_STORAGE } from '@/integrations/moduleContracts.js'
import { onMonitorLogout } from '@/core/client_monitor/collector.js'

export const tokenService = {
  getAccess,
  setTokens,
  clear() {
    onMonitorLogout()
    clearTokens()
    bridge.emit(CORE_AUTH_CLEAR_LEGACY_STORAGE)
  },


  tryRefresh: performTokenRefresh,
  shouldRefresh,
  getSessionClaim,
  getUserId,
  hasActiveSessionScope,
}

export default tokenService
