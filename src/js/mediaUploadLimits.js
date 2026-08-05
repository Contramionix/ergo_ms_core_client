/**
 * Лимиты загрузки через media_api.
 *
 * PLATFORM (CLIENT_MEDIA_UPLOAD_MAX_SIZE ← MEDIA_UPLOAD_MAX_SIZE) — дефолт,
 * если модуль не передал maxSize / feature.
 *
 * HARD (CLIENT_MEDIA_UPLOAD_HARD_MAX_SIZE ← MEDIA_UPLOAD_HARD_MAX_SIZE) —
 * абсолютный потолок. Модуль может запросить maxSize выше PLATFORM, но не выше HARD.
 * maxSize === 0 означает «без модульного потолка» → HARD (как video_analysis).
 */

export const PLATFORM_MEDIA_MAX_BYTES =
  Number(import.meta.env.CLIENT_MEDIA_UPLOAD_MAX_SIZE) || 524288000

const _hardRaw = Number(import.meta.env.CLIENT_MEDIA_UPLOAD_HARD_MAX_SIZE)
export const HARD_MEDIA_MAX_BYTES = Math.max(
  Number.isFinite(_hardRaw) && _hardRaw > 0 ? _hardRaw : 5 * 1024 * 1024 * 1024,
  PLATFORM_MEDIA_MAX_BYTES,
)

/** Именованные UX/feature лимиты (байты); могут быть ниже PLATFORM. */
export const UPLOAD_FEATURE_LIMITS = {
  avatar: 5 * 1024 * 1024,
  messengerAttachment: 25 * 1024 * 1024,
  impulsExcel: 50 * 1024 * 1024,
  tpDocx: 50 * 1024 * 1024,
  aiAssistantChat: 10 * 1024 * 1024,
  lmsResource: 100 * 1024 * 1024,
}

/**
 * @param {Object} options
 * @param {string} [options.targetDir]
 * @param {string[]} [options.allowedTypes]
 * @param {number} [options.maxSize] - байты; 0 = HARD (без модульного потолка)
 * @param {keyof typeof UPLOAD_FEATURE_LIMITS} [options.feature]
 * @returns {{ targetDir?: string, allowedTypes?: string[], maxSize: number }}
 */
export function buildMediaUploadOptions({
  targetDir,
  allowedTypes,
  maxSize,
  feature,
} = {}) {
  const featureCap = feature ? UPLOAD_FEATURE_LIMITS[feature] : undefined
  let requested
  if (maxSize === 0) {
    requested = HARD_MEDIA_MAX_BYTES
  } else if (maxSize != null) {
    requested = Number(maxSize)
  } else if (featureCap != null) {
    requested = featureCap
  } else {
    requested = PLATFORM_MEDIA_MAX_BYTES
  }
  if (!Number.isFinite(requested) || requested <= 0) {
    requested = PLATFORM_MEDIA_MAX_BYTES
  }
  const effective = Math.min(requested, HARD_MEDIA_MAX_BYTES)
  const result = { maxSize: effective }
  if (targetDir != null) result.targetDir = targetDir
  if (allowedTypes != null) result.allowedTypes = allowedTypes
  return result
}

/**
 * @param {File|{ size?: number }} file
 * @param {number} [maxBytes]
 * @returns {boolean}
 */
export function isFileWithinUploadLimit(file, maxBytes = PLATFORM_MEDIA_MAX_BYTES) {
  const size = file?.size
  if (size == null) return true
  return size <= maxBytes
}
