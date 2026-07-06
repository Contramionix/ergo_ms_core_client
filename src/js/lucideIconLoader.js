/**
 * Ленивая загрузка иконок Lucide без import * в стартовом бандле.
 */

let lucideModulePromise = null
const iconComponentCache = new Map()

async function ensureLucideModule() {
  if (!lucideModulePromise) {
    lucideModulePromise = import('lucide-vue-next')
  }
  return lucideModulePromise
}

export function preloadLucideIcons() {
  return ensureLucideModule()
}

export async function getLucideIconAsync(iconName) {
  if (!iconName) {
    return null
  }
  if (iconComponentCache.has(iconName)) {
    return iconComponentCache.get(iconName)
  }
  const module = await ensureLucideModule()
  const component = module[iconName] || null
  if (component) {
    iconComponentCache.set(iconName, component)
  }
  return component
}

export function getLucideIconSync(iconName) {
  if (!iconName) {
    return null
  }
  return iconComponentCache.get(iconName) || null
}

let lucideIconNamesCache = null

export async function getLucideIconNames() {
  if (lucideIconNamesCache) {
    return lucideIconNamesCache
  }
  const module = await ensureLucideModule()
  lucideIconNamesCache = Object.keys(module)
    .filter(
      (key) =>
        key !== 'default' &&
        !key.endsWith('Icon') &&
        /^[A-Z]/.test(key) &&
        (typeof module[key] === 'function' ||
          (typeof module[key] === 'object' && module[key] !== null)),
    )
    .sort()
  return lucideIconNamesCache
}

export async function preloadLucideIconNames(iconNames) {
  const module = await ensureLucideModule()
  for (const iconName of iconNames) {
    if (!iconName || iconComponentCache.has(iconName)) {
      continue
    }
    const component = module[iconName]
    if (component) {
      iconComponentCache.set(iconName, component)
    }
  }
}

export function getLoadedLucideIconMapping() {
  return Object.fromEntries(iconComponentCache.entries())
}

export function clearLucideIconCache() {
  iconComponentCache.clear()
  lucideIconNamesCache = null
}
