import { checkUrlAccess, getMyPermissions } from '@/core/cms/js/cms.js'
import { checkAccessToAdminPanel } from '@/core/cms/adp/admin/js/adminAccessApi.js'
import { getSessionBootstrapCache } from '@/core/cms/js/sessionBootstrapCache.js'
import tokenService from '@/core/cms/js/tokenService.js'
import { logError } from '@/js/utils/logError.js'

const PERMISSIONS_CACHE_TTL = 60 * 1000
const URL_ACCESS_CACHE_TTL = 60 * 1000

/** Совпадает с PermissionService.DEFAULT_ROLE_NAME на сервере. */
export const DEFAULT_ROLE_NAME = 'Пользователь'

/** Совпадает с PermissionService.ADMIN_ROLE_NAME на сервере. */
export const ADMIN_ROLE_NAME = 'Администратор'

/**
 * Отображаемое имя ADP-роли из permissions snapshot (UX).
 * Зеркало PermissionService.resolve_display_role для подписи на карточке.
 */
export function resolveDisplayRoleName(snapshot) {
  const name = snapshot?.role?.name
  if (typeof name === 'string' && name.trim()) {
    return name.trim()
  }
  if (snapshot?.is_global_admin) {
    return ADMIN_ROLE_NAME
  }
  return DEFAULT_ROLE_NAME
}

function getActiveRoleGroups(snapshot) {
  const groups = snapshot?.role_groups || []
  return groups.filter((group) => group?.is_active !== false)
}

function hasExplicitModulePermission(snapshot, moduleName, permissionKey) {
  const modulePermissions = snapshot?.module_permissions || []

  return modulePermissions.some((perm) => {
    const permModuleName = perm.module_name || perm.moduleName
    const permKey = perm.permission_key || perm.permissionKey
    const isGranted = perm.is_granted ?? perm.isGranted ?? false
    return permModuleName === moduleName && permKey === permissionKey && isGranted
  })
}

/**
 * Проверка права модуля — зеркало PermissionService.check_module_permission (клиент, UX).
 */
function isModulePermissionGranted(snapshot, moduleName, permissionKey) {
  if (snapshot?.is_global_admin) {
    return true
  }

  const activeGroups = getActiveRoleGroups(snapshot)
  const listed = snapshot?.module_permissions || []

  if (activeGroups.length > 0) {
    return hasExplicitModulePermission(snapshot, moduleName, permissionKey)
  }

  if (listed.length > 0) {
    return hasExplicitModulePermission(snapshot, moduleName, permissionKey)
  }

  if (snapshot?.role?.name === DEFAULT_ROLE_NAME && permissionKey.endsWith('_view')) {
    return true
  }

  return false
}

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

/** Снимок denied_urls хранит шаблон как есть: `/path/**` должен закрывать и `/path`. */
function deniedUrlMatchesPath(path, entry) {
  if (!path || typeof entry !== 'string' || !entry) {
    return false
  }
  if (path === entry) {
    return true
  }
  if (!entry.endsWith('/**')) {
    return false
  }
  const prefix = entry.slice(0, -3)
  if (!prefix) {
    return true
  }
  return path === prefix || path.startsWith(`${prefix}/`)
}

function isExpectedGuestAuthError(error) {
  const status = error?.response?.status ?? error?.status
  if (status !== 401) {
    return false
  }
  return !tokenService.getAccess()
}

async function ensurePermissionsSnapshot() {
  const now = Date.now()
  if (
    cachedPermissionsSnapshot &&
    now - permissionsSnapshotFetchedAt < PERMISSIONS_CACHE_TTL
  ) {
    return cachedPermissionsSnapshot
  }

  if (!tokenService.getAccess()) {
    cachedPermissionsSnapshot = null
    return null
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
    if (!isExpectedGuestAuthError(error)) {
      logError('[ensurePermissionsSnapshot] Ошибка загрузки snapshot:', error)
    }
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
  if (deniedUrlsSnapshot.some((entry) => deniedUrlMatchesPath(path, entry))) {
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
  if (!permissionsSnapshot) {
    return false
  }

  return isModulePermissionGranted(permissionsSnapshot, moduleName, permissionKey)
}

export async function hasAnyModulePermission(moduleName, permissionKeys = []) {
  if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) {
    return false
  }

  const permissionsSnapshot = await ensurePermissionsSnapshot()
  if (!permissionsSnapshot) {
    return false
  }

  return permissionKeys.some((key) =>
    isModulePermissionGranted(permissionsSnapshot, moduleName, key),
  )
}
