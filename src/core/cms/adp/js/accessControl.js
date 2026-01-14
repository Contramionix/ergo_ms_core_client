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
  } catch (error) {
    console.error('[ensurePermissionsSnapshot] Ошибка загрузки snapshot:', error)
    cachedPermissionsSnapshot = null
  }

  return cachedPermissionsSnapshot
}

export async function getPermissionsSnapshot() {
  return ensurePermissionsSnapshot()
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
    response?.data?.has_access ?? response?.data?.access ?? response?.data?.allowed,
  )

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

  // Фильтруем права только для указанного модуля
  const modulePerms = modulePermissions.filter((perm) => {
    const permModuleName = perm.module_name || perm.moduleName
    return permModuleName === moduleName
  })

  // Проверяем, есть ли хотя бы одно из запрошенных прав с is_granted=true
  return permissionKeys.some((key) => {
    return modulePerms.some((perm) => {
      const permKey = perm.permission_key || perm.permissionKey
      const isGranted = perm.is_granted ?? perm.isGranted ?? false
      return permKey === key && isGranted === true
    })
  })
}


