/**
 * Редкий след в nginx-access.log, когда таблица маршрутов без Login.
 * В консоль не пишет: production и так подменяет console, а частые [boot] мешают.
 */

const BOOT_PATH = '/__client-boot'
const SAFE = /[^a-zA-Z0-9._/-]/g

function sanitize(value, max = 64) {
  const raw = value == null ? '' : String(value)
  return raw.replace(SAFE, '').slice(0, max)
}

/** GET /__client-boot?e=… — без JWT, без POST (иначе SPA даёт 405). */
export function traceClientBoot(event, details = {}) {
  if (typeof window === 'undefined') {
    return
  }
  const params = new URLSearchParams()
  params.set('e', sanitize(event, 40))
  Object.entries(details).forEach(([key, value]) => {
    const safeKey = sanitize(key, 12)
    if (!safeKey) {
      return
    }
    params.set(safeKey, sanitize(value, 80))
  })
  try {
    const img = new Image()
    img.src = `${BOOT_PATH}?${params.toString()}`
  } catch {
    /* ignore */
  }
}
