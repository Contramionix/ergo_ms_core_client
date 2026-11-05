/**
 * Глифы @respeak/lucide-motion-vue по одному файлу.
 * Модуль грузится отдельным чанком при первом запросе анимированной иконки,
 * чтобы barrel пакета не попадал в modulepreload.
 */

const iconModules = import.meta.glob([
  '../../../../virtual_env/npm/node_modules/@respeak/lucide-motion-vue/dist/icons/*.js',
  '!../../../../virtual_env/npm/node_modules/@respeak/lucide-motion-vue/dist/icons/index.js',
])

const iconLoaderByFile = new Map()
for (const [key, loader] of Object.entries(iconModules)) {
  const normalized = key.replace(/\\/g, '/')
  const match = normalized.match(/\/icons\/([^/]+)\.js$/)
  if (match && match[1] !== 'index') {
    iconLoaderByFile.set(match[1], loader)
  }
}

export function hasMotionIconFile(file) {
  return iconLoaderByFile.has(file)
}

export function loadMotionIconModule(file) {
  const loader = iconLoaderByFile.get(file)
  if (!loader) {
    return null
  }
  return loader()
}

const animateIconLoaders = import.meta.glob(
  '../../../../virtual_env/npm/node_modules/@respeak/lucide-motion-vue/dist/chunks/AnimateIcon.vue_*.js',
)

let animateIconPromise = null

export function loadAnimateIconModule() {
  if (!animateIconPromise) {
    const loader = Object.values(animateIconLoaders)[0]
    animateIconPromise = loader ? loader() : Promise.resolve(null)
  }
  return animateIconPromise
}