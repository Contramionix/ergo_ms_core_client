import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

export async function fetchMyProfileChangeRequests() {
  const response = await apiClient.get(cmsEndpoints.auth.profileChangeRequests, {}, true)
  return response.data
}

export async function createProfileChangeRequest(payload) {
  const response = await apiClient.post(cmsEndpoints.auth.profileChangeRequests, payload, true)
  return response.data
}
