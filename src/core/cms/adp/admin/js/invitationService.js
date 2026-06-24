import { apiClient } from '@/js/api/manager'
import { cmsEndpoints } from '@/core/cms/js/endpoints'

export async function fetchInvitations(params = {}) {
  const response = await apiClient.get(cmsEndpoints.cms.invitations, params, true)
  return response.data
}

export async function createInvitation(payload) {
  const response = await apiClient.post(cmsEndpoints.cms.invitations, payload, true)
  return response.data
}

export async function revokeInvitation(invitationId) {
  await apiClient.delete(cmsEndpoints.cms.invitationDetail(invitationId), {}, true)
}

export async function resendInvitation(invitationId) {
  const response = await apiClient.post(cmsEndpoints.cms.invitationResend(invitationId), {}, true)
  return response.data
}

export async function bulkCreateInvitations(payload) {
  const response = await apiClient.post(cmsEndpoints.cms.invitationsBulk, payload, true)
  return response.data
}

export async function bulkSendInvitations(payload) {
  const response = await apiClient.post(cmsEndpoints.cms.invitationsBulkSend, payload, true)
  return response.data
}
