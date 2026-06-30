/**
 * ЦЕНТРАЛИЗОВАННЫЙ КЕШ АВАТАРОК
 *
 * Аватарки отдаются media_api подписанными URL, у которых signature/expires
 * меняются при каждой загрузке страницы, поэтому обычный HTTP-кеш браузера не
 * срабатывает и на Ctrl+F5 картинка перекачивается заново (видно мигание).
 *
 * Сервис кеширует сами байты изображения в Cache API:
 *  - ключ — путь URL без волатильных query-параметров (стабилен между загрузками);
 *  - Cache API переживает Ctrl+F5 и не зависит от HTTP-кеша;
 *  - наружу отдаётся стабильный object URL (blob:), который не требует сети.
 *
 * Безопасность: храним только байты изображения по пути файла (как обычный
 * браузерный кеш статики). Токены, имена, user_id и прочие PII не сохраняются.
 */

const CACHE_NAME = 'ergo-avatars-v1'

const memoryUrls = new Map() // cacheKey -> objectURL (синхронный доступ в пределах сессии)
const inflight = new Map() // cacheKey -> Promise<string|null>
const decodedKeys = new Set() // cacheKey — байты уже декодированы off-DOM в этой сессии

function supportsCacheApi() {
  return typeof caches !== 'undefined' && typeof Response !== 'undefined'
}

function cacheKeyFor(url) {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin + parsed.pathname
  } catch {
    return url
  }
}

/** Стабильный ключ кеша (путь без подписи/expires в query). */
export function avatarCacheKey(url) {
  if (!url) return ''
  return cacheKeyFor(url)
}

async function readFromCache(key) {
  if (!supportsCacheApi()) return null
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(key)
    if (!response) return null
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

async function fetchAndStore(url, key) {
  const response = await fetch(url, { credentials: 'omit', mode: 'cors' })
  if (!response.ok) {
    throw new Error(`avatar fetch failed: ${response.status}`)
  }

  const blob = await response.blob()

  if (supportsCacheApi()) {
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(
        key,
        new Response(blob, { headers: { 'Content-Type': blob.type || 'image/*' } }),
      )
    } catch {
      // переполнение квоты / приватный режим — не критично
    }
  }

  return URL.createObjectURL(blob)
}

/**
 * Синхронно возвращает закешированный object URL, если он уже есть в памяти.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function peekAvatar(url) {
  if (!url) return null
  return memoryUrls.get(cacheKeyFor(url)) ?? null
}

/**
 * Синхронно возвращает src для <img>, если аватар уже закеширован и декодирован.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function peekAvatarDisplaySrc(url) {
  if (!url) return null
  const key = cacheKeyFor(url)
  if (!decodedKeys.has(key)) return null
  return memoryUrls.get(key) ?? null
}

/**
 * Возвращает стабильный object URL для аватарки (из памяти, Cache API или сети).
 * При неудаче (CORS/сеть) возвращает null — вызывающий код использует исходный URL.
 * @param {string|null|undefined} url
 * @returns {Promise<string|null>}
 */
export function resolveAvatar(url) {
  if (!url) return Promise.resolve(null)

  const key = cacheKeyFor(url)

  if (memoryUrls.has(key)) {
    return Promise.resolve(memoryUrls.get(key))
  }
  if (inflight.has(key)) {
    return inflight.get(key)
  }

  const promise = (async () => {
    let objectUrl = await readFromCache(key)
    if (!objectUrl) {
      try {
        objectUrl = await fetchAndStore(url, key)
      } catch {
        return null
      }
    }
    memoryUrls.set(key, objectUrl)
    return objectUrl
  })()

  inflight.set(key, promise)
  promise.finally(() => inflight.delete(key))
  return promise
}

/**
 * Сбрасывает кеш для конкретной аватарки (например, после загрузки новой).
 * @param {string|null|undefined} url
 */
export function invalidateAvatar(url) {
  if (!url) return

  const key = cacheKeyFor(url)
  const existing = memoryUrls.get(key)
  if (existing) {
    URL.revokeObjectURL(existing)
  }
  memoryUrls.delete(key)
  inflight.delete(key)
  decodedKeys.delete(key)

  if (supportsCacheApi()) {
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.delete(key))
      .catch(() => {})
  }
}

const inflightDisplay = new Map()

function preloadDecodedImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const done = () => resolve(src)
      if (typeof img.decode === 'function') {
        img.decode().then(done).catch(done)
      } else {
        done()
      }
    }
    img.onerror = () => reject(new Error('avatar preload failed'))
    img.src = src
  })
}

/**
 * Возвращает src, готовый к мгновенному показу в <img> (кеш + decode off-DOM).
 * @param {string|null|undefined} url
 * @returns {Promise<string|null>}
 */
export function ensureAvatarDisplaySrc(url) {
  if (!url) return Promise.resolve(null)

  const key = cacheKeyFor(url)
  if (inflightDisplay.has(key)) {
    return inflightDisplay.get(key)
  }

  const promise = (async () => {
    const blobSrc = peekAvatar(url) || await resolveAvatar(url)
    const candidates = [...new Set([blobSrc, url].filter(Boolean))]

    for (const candidate of candidates) {
      try {
        await preloadDecodedImage(candidate)
        decodedKeys.add(key)
        return candidate
      } catch {
        // пробуем следующий источник
      }
    }
    return null
  })()

  inflightDisplay.set(key, promise)
  return promise.finally(() => inflightDisplay.delete(key))
}

/**
 * Полностью очищает кеш аватарок (например, при выходе пользователя).
 */
export function clearAvatarCache() {
  for (const objectUrl of memoryUrls.values()) {
    URL.revokeObjectURL(objectUrl)
  }
  memoryUrls.clear()
  inflight.clear()
  inflightDisplay.clear()
  decodedKeys.clear()

  if (supportsCacheApi()) {
    caches.delete(CACHE_NAME).catch(() => {})
  }
}
