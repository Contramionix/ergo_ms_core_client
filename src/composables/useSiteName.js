import { ref } from 'vue'

import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { DEFAULT_SITE_NAME } from '@/js/siteWordmark.js'

const siteName = ref(DEFAULT_SITE_NAME)
let initialized = false
let loading = null

function applyDocumentTitle(name) {
  if (typeof document === 'undefined') {
    return
  }

  document.title = name || DEFAULT_SITE_NAME
}

export async function ensureSiteNameLoaded() {
  if (initialized) {
    return siteName.value
  }

  if (!loading) {
    loading = (async () => {
      try {
        const response = await apiClient.get(endpoints.settings.siteName)
        siteName.value = response.data?.site_name || DEFAULT_SITE_NAME
      } catch {
        siteName.value = DEFAULT_SITE_NAME
      }

      initialized = true
      applyDocumentTitle(siteName.value)
      return siteName.value
    })()
  }

  return loading
}

export function useSiteName() {
  return {
    siteName,
    ensureSiteNameLoaded,
  }
}
