import { performTokenRefresh } from '@/core/cms/js/tokenRefresh.js'
import {
  clearTokens,
  getAccess,
  getAccessExp,
  getPayload,
  getSessionClaim,
  getUserId,
  hasActiveSessionScope,
  setTokens,
  shouldRefresh,
} from '@/core/cms/js/tokenStorage.js'

export const tokenService = {
  getAccess,
  getAccessExp,
  setTokens,
  clear: clearTokens,
  tryRefresh: performTokenRefresh,
  shouldRefresh,
  getUserId,
  getSessionClaim,
  hasActiveSessionScope,
  getPayload,
}

export default tokenService
