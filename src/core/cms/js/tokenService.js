import { performTokenRefresh } from '@/core/cms/js/tokenRefresh.js'
import {
  clearTokens,
  getAccess,
  getAccessExp,
  getDepartmentId,
  getOrganizationId,
  getPayload,
  getUserId,
  hasActiveOrganization,
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
  getOrganizationId,
  getDepartmentId,
  hasActiveOrganization,
  getPayload,
}

export default tokenService
