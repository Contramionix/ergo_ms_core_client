import { CheckAccess } from '@/core/cms/js/cms'

const PERMISSIONS_CACHE_TTL = 60 * 1000
let cachedPermissionsSnapshot = null
let permissionsSnapshotFetchedAt = 0

async function ensurePermissionsSnapshot() {
  const now = Date.now()
  if (
    cachedPermissionsSnapshot &&
    now - permissionsSnapshotFetchedAt < PERMISSIONS_CACHE_TTL
  ) {
    return cachedPermissionsSnapshot
  }

  try {
    const response = await CheckAccess.GetMyPermissions()
    cachedPermissionsSnapshot = response?.data || response
    permissionsSnapshotFetchedAt = now
  } catch {
    cachedPermissionsSnapshot = null
  }

  return cachedPermissionsSnapshot
}

export async function checkRouteAdpAccess(path) {
  const permissionsSnapshot = await ensurePermissionsSnapshot()

  const deniedUrlsSnapshot = permissionsSnapshot?.denied_urls || []
  const explicitlyDenied = deniedUrlsSnapshot.includes(path)

  if (explicitlyDenied) {
    return false
  }

  const response = await CheckAccess.CheckURLAccess(path)
  const allowed = Boolean(
    response?.data?.access ?? response?.data?.allowed ?? response?.data,
  )

  return allowed
}


