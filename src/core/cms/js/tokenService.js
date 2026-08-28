import { loadCollector } from '@/core/client_monitor/loadCollector.js'
import { isMonitoringEnabled, resetMonitorSession } from '@/core/client_monitor/session.js'
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

function notifyMonitorLogout() {
  if (!isMonitoringEnabled()) {
    resetMonitorSession()
    return
  }
  void loadCollector()
    .then(({ onMonitorLogout }) => onMonitorLogout())
    .catch(() => resetMonitorSession())
}

export const tokenService = {
  getAccess,
  setTokens,
  clear() {
    notifyMonitorLogout()
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
