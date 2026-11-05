/**
 * Ленивая загрузка анимированных иконок Lucide по одной
 * (dist/icons/*.js пакета @respeak/lucide-motion-vue).
 *
 * Имя то же, что у статических глифов: PascalCase, `user-round`, `lucide:Bell`.
 * Алиасы (Home → house) берутся из карты @lucide/vue. Если анимированного
 * файла нет, загрузчик возвращает null — вызывающий показывает LucideIcon.
 */

import { normalizeLucideIconName } from '@/js/lucideIconLoader.js'

export { normalizeLucideIconName }

const iconComponentCache = new Map()
const iconComponentByFile = new Map()
/** @type {Map<string, Promise<unknown>>} */
const iconLoadPromises = new Map()

/** @type {Promise<{ LUCIDE_ICON_FILES: Record<string, string> }>|null} */
let iconMapPromise = null

function loadIconMapModule() {
  if (!iconMapPromise) {
    iconMapPromise = import('@/js/lucideIconFiles.generated.js')
  }
  return iconMapPromise
}

/** @type {Promise<typeof import('./lucideMotionIconGlob.js')>|null} */
let iconGlobPromise = null

function loadIconGlob() {
  if (!iconGlobPromise) {
    iconGlobPromise = import('./lucideMotionIconGlob.js')
  }
  return iconGlobPromise
}

/**
 * @param {string} iconName
 * @returns {Promise<string|null>} kebab-файл в пакете анимаций
 */
async function resolveMotionFile(iconName) {
  const key = normalizeLucideIconName(iconName)
  if (!key) {
    return null
  }
  const { LUCIDE_ICON_FILES } = await loadIconMapModule()
  const file = LUCIDE_ICON_FILES[key]
  if (!file) {
    return null
  }
  const { hasMotionIconFile } = await loadIconGlob()
  return hasMotionIconFile(file) ? file : null
}

/**
 * @param {string} iconName PascalCase или нормализуемая строка
 * @returns {Promise<import('vue').Component|null>}
 */
async function loadIconComponent(iconName) {
  const key = normalizeLucideIconName(iconName)
  if (!key) {
    return null
  }
  if (iconComponentCache.has(key)) {
    return iconComponentCache.get(key)
  }
  if (iconLoadPromises.has(key)) {
    return iconLoadPromises.get(key)
  }

  const promise = (async () => {
    const file = await resolveMotionFile(key)
    if (!file) {
      return null
    }
    if (iconComponentByFile.has(file)) {
      const cached = iconComponentByFile.get(file)
      iconComponentCache.set(key, cached)
      return cached
    }
    const { loadMotionIconModule } = await loadIconGlob()
    const mod = await loadMotionIconModule(file)
    const component = mod?.default || null
    if (component) {
      iconComponentByFile.set(file, component)
      iconComponentCache.set(key, component)
    }
    return component
  })()

  iconLoadPromises.set(key, promise)
  try {
    return await promise
  } finally {
    iconLoadPromises.delete(key)
  }
}

export async function hasLucideMotionIcon(iconName) {
  return (await resolveMotionFile(iconName)) != null
}

export async function getLucideMotionIconAsync(iconName) {
  return loadIconComponent(iconName)
}

export function getLucideMotionIconSync(iconName) {
  const key = normalizeLucideIconName(iconName)
  if (!key) {
    return null
  }
  return iconComponentCache.get(key) || null
}

export async function getLucideMotionIconNames() {
  const { LUCIDE_ICON_FILES } = await loadIconMapModule()
  const { hasMotionIconFile } = await loadIconGlob()
  return Object.keys(LUCIDE_ICON_FILES)
    .filter((name) => hasMotionIconFile(LUCIDE_ICON_FILES[name]))
    .sort()
}

export async function preloadLucideMotionIconNames(iconNames) {
  if (!Array.isArray(iconNames) || iconNames.length === 0) {
    return
  }
  const unique = [
    ...new Set(
      iconNames
        .map((name) => normalizeLucideIconName(name))
        .filter(Boolean),
    ),
  ]
  await Promise.all(unique.map((name) => loadIconComponent(name)))
}

export function clearLucideMotionIconCache() {
  iconComponentCache.clear()
  iconComponentByFile.clear()
  iconLoadPromises.clear()
}