// Кэш публичных данных пользователей в пределах сессии SPA.
// Хранит first_name/last_name/full_name/avatar_url по user_id,
// чтобы UserAvatar.vue мог стабильно отображать инициалы, цвет и аватар.
import { apiClient } from '@/js/api/manager'

const userInfoCache = new Map()
// Кеш/запросы по public_id (непоследовательная ссылка) — единственный сетевой путь.
const userInfoByRefCache = new Map()
const pendingByRef = new Map()
const SIGNED_URL_MIN_SECONDS_LEFT = 60

function normalizeId(userId) {
  if (userId == null) return null
  const num = Number(userId)
  return Number.isFinite(num) ? Math.trunc(num) : null
}

function getExpiresMeta(url) {
  try {
    if (!url) return { hasSignature: false, secondsLeft: null }
    const parsed = new URL(url, window.location.origin)
    const expiresRaw = parsed.searchParams.get('expires')
    const expires = expiresRaw ? Number(expiresRaw) : null
    const nowSec = Math.floor(Date.now() / 1000)
    return {
      hasSignature: Boolean(parsed.searchParams.get('signature')),
      secondsLeft: Number.isFinite(expires) ? (expires - nowSec) : null,
    }
  } catch {
    return { hasSignature: false, secondsLeft: null }
  }
}

function isAvatarUrlExpired(url) {
  const { hasSignature, secondsLeft } = getExpiresMeta(url)
  return hasSignature && secondsLeft !== null && secondsLeft < SIGNED_URL_MIN_SECONDS_LEFT
}

function normalizeInfo(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = normalizeId(raw.user_id ?? raw.id)
  const publicId = raw.public_id ?? raw.publicId ?? null
  if (id === null && !publicId) return null
  return {
    userId: id,
    publicId: publicId ? String(publicId) : null,
    username: raw.username || '',
    firstName: raw.first_name || raw.firstName || '',
    lastName: raw.last_name || raw.lastName || '',
    middleName: raw.middle_name || raw.middleName || '',
    fullName: raw.full_name || raw.fullName || '',
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? null,
  }
}

/** Кладёт запись в оба индекса (по числовому id и по public_id), если они есть. */
function indexInfo(info) {
  if (!info) return
  if (info.userId !== null && info.userId !== undefined) {
    userInfoCache.set(info.userId, info)
  }
  if (info.publicId) {
    userInfoByRefCache.set(info.publicId, info)
  }
}

function trimNamePart(value) {
  return (value || '').trim()
}

/**
 * Разбирает ФИО формата «Фамилия Имя [Отчество]» для UserAvatar без запроса public-info.
 */
export function parseFullNameParts(fullName) {
  const { firstName, lastName } = parseErgoFullNameParts(fullName)
  return { firstName, lastName }
}

/**
 * Разбирает ERGO-ФИО «Фамилия Имя [Отчество]» в части имени.
 */
export function parseErgoFullNameParts(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { lastName: '', firstName: '', middleName: '' }
  }
  if (parts.length === 1) {
    return { lastName: parts[0], firstName: parts[0], middleName: '' }
  }
  if (parts.length === 2) {
    return { lastName: parts[0], firstName: parts[1], middleName: '' }
  }
  return {
    lastName: parts[0],
    firstName: parts[1],
    middleName: parts.slice(2).join(' '),
  }
}

/**
 * Варианты отображения имени инициатора (как get_full_name / get_initials_name на бэкенде).
 */
export function buildActorNameVariants({ lastName, firstName, middleName, fallbackLabel }) {
  const ln = trimNamePart(lastName)
  const fn = trimNamePart(firstName)
  const mn = trimNamePart(middleName)
  const hasMiddleName = Boolean(mn)

  const parts = [ln, fn, mn].filter(Boolean)
  let fullName = parts.join(' ')
  if (!fullName) {
    fullName = trimNamePart(fallbackLabel)
  }

  let expandedDisplay = fullName
  if (!hasMiddleName) {
    if (ln && fn) {
      expandedDisplay = `${ln} ${fn}`
    } else if (ln) {
      expandedDisplay = ln
    } else if (fn) {
      expandedDisplay = fn
    }
  }

  let compactDisplay = null
  if (hasMiddleName) {
    const initialsParts = []
    if (fn) initialsParts.push(`${fn[0].toUpperCase()}.`)
    if (mn) initialsParts.push(`${mn[0].toUpperCase()}.`)
    const initialsBlock = initialsParts.join('')
    if (ln && initialsBlock) {
      compactDisplay = `${ln} ${initialsBlock}`
    } else if (ln) {
      compactDisplay = ln
    } else {
      compactDisplay = initialsBlock || fullName
    }
  }

  return {
    fullName,
    expandedDisplay: expandedDisplay || fullName,
    compactDisplay,
    hasMiddleName,
  }
}

/**
 * Прогревает кеш публичных данных из уже загруженных списков (members, candidates).
 */
export function seedUserPublicInfoCache(entries) {
  if (!Array.isArray(entries)) return
  for (const entry of entries) {
    indexInfo(normalizeInfo(entry))
  }
}

/**
 * Получить публичные данные пользователя по public_id (непоследовательная ссылка).
 * Единственный сетевой способ загрузки чужих публичных данных — по числовому id
 * эндпоинта больше нет (был убран как enumeration-риск).
 */
export async function getUserPublicInfoByRef(ref) {
  if (!ref) return null
  const key = String(ref)

  if (userInfoByRefCache.has(key)) {
    const cached = userInfoByRefCache.get(key)
    if (!isAvatarUrlExpired(cached?.avatarUrl)) return cached
    userInfoByRefCache.delete(key)
  }

  if (pendingByRef.has(key)) return pendingByRef.get(key)

  const promise = apiClient
    .get(`/cms/users/by-ref/${key}/public-info/`)
    .then((resp) => {
      const raw = resp?.data ?? resp
      const info = normalizeInfo(raw) ?? { userId: null, publicId: key, username: '', firstName: '', lastName: '', middleName: '', fullName: '', avatarUrl: null }
      indexInfo(info)
      return info
    })
    .catch(() => {
      const fallback = { userId: null, publicId: key, username: '', firstName: '', lastName: '', middleName: '', fullName: '', avatarUrl: null }
      userInfoByRefCache.set(key, fallback)
      return fallback
    })
    .finally(() => pendingByRef.delete(key))

  pendingByRef.set(key, promise)
  return promise
}

export function getCachedUserPublicInfo(userId) {
  const id = normalizeId(userId)
  if (id === null) return null
  return userInfoCache.get(id) ?? null
}

export function getCachedUserPublicInfoByRef(ref) {
  if (!ref) return null
  return userInfoByRefCache.get(String(ref)) ?? null
}

export function invalidateUserPublicInfo(userId) {
  const id = normalizeId(userId)
  if (id !== null) userInfoCache.delete(id)
}

export function invalidateUserPublicInfoByRef(ref) {
  if (ref) userInfoByRefCache.delete(String(ref))
}

export function clearUserPublicInfoCache() {
  userInfoCache.clear()
  userInfoByRefCache.clear()
}

export function getCachedUserAvatar(userId) {
  return getCachedUserPublicInfo(userId)?.avatarUrl ?? null
}

export function clearUserAvatarCache() {
  clearUserPublicInfoCache()
}

export function invalidateUserAvatar(userId) {
  invalidateUserPublicInfo(userId)
}
