import { ref } from 'vue'

import { DEFAULT_SITE_NAME } from '@/js/siteWordmark.js'

const siteName = ref(
  (import.meta?.env?.VITE_SITE_NAME || DEFAULT_SITE_NAME).toString().trim() || DEFAULT_SITE_NAME,
)
let initialized = false

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

  initialized = true
  applyDocumentTitle(siteName.value)
  return siteName.value
}

export function useSiteName() {
  return {
    siteName,
    ensureSiteNameLoaded,
  }
}
