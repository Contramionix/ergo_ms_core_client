/**
 * Ленивая загрузка иконок Lucide по одной (dist/esm/icons/*.js),
 * без import всего barrel lucide-vue-next в критический путь.
 */

/**
 * Vite разбивает каждый файл на отдельный чанк при dynamic import через glob.
 * Путь от src/js к virtual_env/npm/node_modules (см. npm-workspace).
 */
const iconModules = import.meta.glob(
  '../../../../virtual_env/npm/node_modules/lucide-vue-next/dist/esm/icons/*.js',
)

/** file (kebab) → loader */
const iconLoaderByFile = new Map()
for (const [key, loader] of Object.entries(iconModules)) {
  const normalized = key.replace(/\\/g, '/')
  const match = normalized.match(/\/icons\/([^/]+)\.js$/)
  if (match) {
    iconLoaderByFile.set(match[1], loader)
  }
}

const iconComponentCache = new Map()
/** file (kebab) → component — общие алиасы Home/House */
const iconComponentByFile = new Map()
/** @type {Map<string, Promise<unknown>>} */
const iconLoadPromises = new Map()

/** @type {Promise<{ LUCIDE_ICON_FILES: Record<string, string>, LUCIDE_ICON_NAMES: string[] }>|null} */
let iconMapPromise = null

function loadIconMapModule() {
  if (!iconMapPromise) {
    iconMapPromise = import('@/js/lucideIconFiles.generated.js')
  }
  return iconMapPromise
}

function resolveIconLoader(file) {
  return iconLoaderByFile.get(file) || null
}

/**
 * @param {string} iconName PascalCase (Home, Settings, …)
 * @returns {Promise<import('vue').Component|null>}
 */
async function loadIconComponent(iconName) {
  if (!iconName || typeof iconName !== 'string') {
    return null
  }
  if (iconComponentCache.has(iconName)) {
    return iconComponentCache.get(iconName)
  }
  if (iconLoadPromises.has(iconName)) {
    return iconLoadPromises.get(iconName)
  }

  const promise = (async () => {
    const { LUCIDE_ICON_FILES } = await loadIconMapModule()
    const file = LUCIDE_ICON_FILES[iconName]
    if (!file) {
      return null
    }

    if (iconComponentByFile.has(file)) {
      const cached = iconComponentByFile.get(file)
      iconComponentCache.set(iconName, cached)
      return cached
    }

    const loader = resolveIconLoader(file)
    if (!loader) {
      return null
    }

    const mod = await loader()
    const component = mod.default || null
    if (component) {
      iconComponentByFile.set(file, component)
      iconComponentCache.set(iconName, component)
    }
    return component
  })()

  iconLoadPromises.set(iconName, promise)
  try {
    return await promise
  } finally {
    iconLoadPromises.delete(iconName)
  }
}

/** @deprecated больше не тянет весь barrel; no-op для совместимости IconManager */
export function preloadLucideIcons() {
  return Promise.resolve()
}

export async function getLucideIconAsync(iconName) {
  return loadIconComponent(iconName)
}

export function getLucideIconSync(iconName) {
  if (!iconName) {
    return null
  }
  return iconComponentCache.get(iconName) || null
}

export async function getLucideIconNames() {
  const { LUCIDE_ICON_NAMES } = await loadIconMapModule()
  return [...LUCIDE_ICON_NAMES]
}

export async function preloadLucideIconNames(iconNames) {
  if (!Array.isArray(iconNames) || iconNames.length === 0) {
    return
  }
  const unique = [...new Set(iconNames.filter(Boolean))]
  await Promise.all(unique.map((name) => loadIconComponent(name)))
}

export function getLoadedLucideIconMapping() {
  return Object.fromEntries(iconComponentCache.entries())
}

export function clearLucideIconCache() {
  iconComponentCache.clear()
  iconComponentByFile.clear()
  iconLoadPromises.clear()
}
