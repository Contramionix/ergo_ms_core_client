import { checkUrlAccess, getMyPermissions } from '@/core/cms/js/cms.js'
import { checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { getSessionBootstrapCache } from '@/core/cms/js/sessionBootstrapCache.js'
import { logError } from '@/js/utils/logError.js'

const PERMISSIONS_CACHE_TTL = 60 * 1000
const URL_ACCESS_CACHE_TTL = 60 * 1000

let cachedPermissionsSnapshot = null
let permissionsSnapshotFetchedAt = 0
const urlAccessCache = new Map()

function readPermissionsFromBootstrap() {
  const bootstrap = getSessionBootstrapCache()
  const permissions = bootstrap?.permissions
  if (!permissions || typeof permissions !== 'object') {
    return null
  }
  return permissions
}

/** Прогревает snapshot прав из session-bootstrap (без сетевого запроса). */
export function applyPermissionsBootstrap(permissionsData) {
  if (!permissionsData || typeof permissionsData !== 'object') {
    return null
  }
  cachedPermissionsSnapshot = permissionsData
  permissionsSnapshotFetchedAt = Date.now()
  urlAccessCache.clear()
  return cachedPermissionsSnapshot
}

async function ensurePermissionsSnapshot() {
  const now = Date.now()
  if (
    cachedPermissionsSnapshot &&
    now - permissionsSnapshotFetchedAt < PERMISSIONS_CACHE_TTL
  ) {
    return cachedPermissionsSnapshot
  }

  const fromBootstrap = readPermissionsFromBootstrap()
  if (fromBootstrap) {
    return applyPermissionsBootstrap(fromBootstrap)
  }

  try {
    const response = await getMyPermissions()
    cachedPermissionsSnapshot = response?.data || response
    permissionsSnapshotFetchedAt = now
    urlAccessCache.clear()
  } catch (error) {
    logError('[ensurePermissionsSnapshot] Ошибка загрузки snapshot:', error)
    cachedPermissionsSnapshot = null
  }

  return cachedPermissionsSnapshot
}

export function invalidatePermissionsSnapshot() {
  cachedPermissionsSnapshot = null
  permissionsSnapshotFetchedAt = 0
  urlAccessCache.clear()
}

export function invalidateUrlAccessCache() {
  urlAccessCache.clear()
}

export async function getPermissionsSnapshot() {
  return ensurePermissionsSnapshot()
}

export async function checkGlobalAdminAccess() {
  const access = await checkAccessToAdminPanel()
  return Boolean(access?.access_to_panel)
}

export async function checkRouteAdpAccess(path) {
  const now = Date.now()
  const cached = urlAccessCache.get(path)
  if (cached && now < cached.expiresAt) {
    return cached.allowed
  }

  const permissionsSnapshot = await ensurePermissionsSnapshot()

  if (permissionsSnapshot?.is_global_admin) {
    urlAccessCache.set(path, { allowed: true, expiresAt: now + URL_ACCESS_CACHE_TTL })
    return true
  }

  const deniedUrlsSnapshot = permissionsSnapshot?.denied_urls || []
  if (deniedUrlsSnapshot.includes(path)) {
    urlAccessCache.set(path, { allowed: false, expiresAt: now + URL_ACCESS_CACHE_TTL })
    return false
  }

  const response = await checkUrlAccess(path)
  const allowed = Boolean(
    response?.data?.has_access ?? response?.data?.access ?? response?.data?.allowed,
  )

  urlAccessCache.set(path, { allowed, expiresAt: now + URL_ACCESS_CACHE_TTL })
  return allowed
}

export async function hasModulePermission(moduleName, permissionKey) {
  const permissionsSnapshot = await ensurePermissionsSnapshot()
  const modulePermissions = permissionsSnapshot?.module_permissions || []

  return modulePermissions.some((perm) => {
    const permModuleName = perm.module_name || perm.moduleName
    const permKey = perm.permission_key || perm.permissionKey
    const isGranted = perm.is_granted ?? perm.isGranted ?? false
    return permModuleName === moduleName && permKey === permissionKey && isGranted
  })
}

export async function hasAnyModulePermission(moduleName, permissionKeys = []) {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) {
    return false
  }

  const permissionsSnapshot = await ensurePermissionsSnapshot()
  const modulePermissions = permissionsSnapshot?.module_permissions || []

  const modulePerms = modulePermissions.filter((perm) => {
    const permModuleName = perm.module_name || perm.moduleName
    return permModuleName === moduleName
  })

  return permissionKeys.some((key) => {
    return modulePerms.some((perm) => {
      const permKey = perm.permission_key || perm.permissionKey
      const isGranted = perm.is_granted ?? perm.isGranted ?? false
      return permKey === key && isGranted === true
    })
  })
}
