const ADMIN_ACCESS_CACHE_TTL = 60 * 1000

let cachedAdminAccess = null
let adminAccessFetchedAt = 0

export function invalidateAdminAccessCache() {
  cachedAdminAccess = null
  adminAccessFetchedAt = 0
}

export function getAdminAccessCache(now = Date.now()) {
  if (cachedAdminAccess && now - adminAccessFetchedAt < ADMIN_ACCESS_CACHE_TTL) {
    return cachedAdminAccess
  }
  return null
}

export function setAdminAccessCache(value) {
  cachedAdminAccess = value
  adminAccessFetchedAt = Date.now()
  return cachedAdminAccess
}
