import { apiClient } from '@/js/api/manager.js'
import { cmsEndpoints as endpoints } from '@/core/cms/js/endpoints.js'

/** Права текущего пользователя и проверка URL (маршруты, UX). */
export async function getMyPermissions() {
  return apiClient.get(endpoints.cms.myPermissions, {}, true)
}

export async function checkUrlAccess(url) {
  return apiClient.get(endpoints.cms.checkURLAccess, { url }, true)
}
