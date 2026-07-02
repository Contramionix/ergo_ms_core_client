import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

export async function fetchAdminProfileChangeRequests(params = {}) {
  const response = await apiClient.get(cmsEndpoints.cms.profileChangeRequestsAdmin, params, true)
  return response.data
}

export async function approveProfileChangeRequest(requestId) {
  const response = await apiClient.post(
    cmsEndpoints.cms.profileChangeRequestApprove(requestId),
    {},
    true,
  )
  return response.data
}

export async function rejectProfileChangeRequest(requestId, payload = {}) {
  const response = await apiClient.post(
    cmsEndpoints.cms.profileChangeRequestReject(requestId),
    payload,
    true,
  )
  return response.data
}
