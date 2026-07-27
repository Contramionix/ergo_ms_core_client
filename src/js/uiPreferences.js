/**
 * Режимы UI: анимации, картинки, контраст, помощь диктору.
 * Атрибуты на <html> — единый контракт для ядра и модулей.
 */

export const MOTION_MODES = ['system', 'reduce', 'full']
export const IMAGE_MODES = ['system', 'on', 'off']
export const CONTRAST_MODES = ['system', 'more', 'normal']
export const A11Y_MODES = ['default', 'assist']

export const UI_MODES_CHANGE_EVENT = 'ergo:ui-modes-change'

const MOTION_KEY = 'ergo_ui_motion'
const IMAGES_KEY = 'ergo_ui_images'
const CONTRAST_KEY = 'ergo_ui_contrast'
const A11Y_KEY = 'ergo_ui_a11y'

const DEFAULT_MOTION = 'system'
const DEFAULT_IMAGES = 'system'
const DEFAULT_CONTRAST = 'system'
const DEFAULT_A11Y = 'default'

/** 1×1 GIF — probe без сети; при «не показывать изображения» в Chrome часто naturalWidth === 0. */
const IMAGE_PROBE_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

let systemMotionMql = null
let systemContrastMql = null
let forcedColorsMql = null

/** null — ещё не проверено; true — браузер режет картинки; false — картинки доступны. */
let browserImagesDisabled = null
let imagesProbePromise = null

export function readMotionPreference() {
  const stored = localStorage.getItem(MOTION_KEY)
  return MOTION_MODES.includes(stored) ? stored : DEFAULT_MOTION
}

export function readImagesPreference() {
  const stored = localStorage.getItem(IMAGES_KEY)
  return IMAGE_MODES.includes(stored) ? stored : DEFAULT_IMAGES
}

export function readContrastPreference() {
  const stored = localStorage.getItem(CONTRAST_KEY)
  return CONTRAST_MODES.includes(stored) ? stored : DEFAULT_CONTRAST
}

export function readA11yPreference() {
  const stored = localStorage.getItem(A11Y_KEY)
  return A11Y_MODES.includes(stored) ? stored : DEFAULT_A11Y
}

export function writeMotionPreference(mode) {
  if (!MOTION_MODES.includes(mode)) return
  localStorage.setItem(MOTION_KEY, mode)
}

export function writeImagesPreference(mode) {
  if (!IMAGE_MODES.includes(mode)) return
  localStorage.setItem(IMAGES_KEY, mode)
}

export function writeContrastPreference(mode) {
  if (!CONTRAST_MODES.includes(mode)) return
  localStorage.setItem(CONTRAST_KEY, mode)
}

export function writeA11yPreference(mode) {
  if (!A11Y_MODES.includes(mode)) return
  localStorage.setItem(A11Y_KEY, mode)
}

export function prefersReducedMotionSystem() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** ОС/браузер просят повышенный контраст или включены forced colors (Win HC). */
export function prefersHighContrastSystem() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    if (window.matchMedia('(prefers-contrast: more)').matches) return true
    if (window.matchMedia('(prefers-contrast: custom)').matches) return true
    if (window.matchMedia('(forced-colors: active)').matches) return true
  } catch {
    return false
  }
  return false
}

/** Итоговый режим анимаций после учёта system. */
export function resolveMotionActive(preference = readMotionPreference()) {
  if (preference === 'reduce') return true
  if (preference === 'full') return false
  return prefersReducedMotionSystem()
}

/**
 * Эффективное «без картинок».
 * system — по probe браузера; off — всегда; on — всегда показывать (CSS-режим off не включаем).
 */
export function resolveImagesOff(preference = readImagesPreference()) {
  if (preference === 'off') return true
  if (preference === 'on') return false
  return browserImagesDisabled === true
}

/** Эффективный высокий контраст. */
export function resolveContrastMore(preference = readContrastPreference()) {
  if (preference === 'more') return true
  if (preference === 'normal') return false
  return prefersHighContrastSystem()
}

export function isImagesOff(preference = readImagesPreference()) {
  return resolveImagesOff(preference)
}

export function isA11yAssist(preference = readA11yPreference()) {
  return preference === 'assist'
}

export function getBrowserImagesDisabled() {
  return browserImagesDisabled
}

/**
 * Эвристика: Chrome/аналоги с выключенными изображениями.
 * Результат только в памяти — не пишем в localStorage.
 */
export function probeBrowserImagesDisabled() {
  if (typeof window === 'undefined') {
    browserImagesDisabled = false
    return Promise.resolve(false)
  }
  if (browserImagesDisabled !== null) {
    return Promise.resolve(browserImagesDisabled)
  }
  if (imagesProbePromise) {
    return imagesProbePromise
  }

  imagesProbePromise = new Promise((resolve) => {
    let settled = false
    const finish = (disabled) => {
      if (settled) return
      settled = true
      browserImagesDisabled = Boolean(disabled)
      resolve(browserImagesDisabled)
    }

    try {
      const img = new Image()
      img.onload = () => {
        finish(!(img.naturalWidth > 0 && img.naturalHeight > 0))
      }
      img.onerror = () => finish(true)
      img.src = IMAGE_PROBE_PIXEL
      window.setTimeout(() => {
        if (settled) return
        finish(!(img.naturalWidth > 0 && img.naturalHeight > 0))
      }, 400)
    } catch {
      finish(true)
    }
  })

  return imagesProbePromise
}

function notifyUiModesChange(detail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(UI_MODES_CHANGE_EVENT, { detail }))
}

function syncContrastPaletteSideEffect() {
  void import('@/js/contrastOverride.js')
    .then(({ syncContrastPaletteWithPreference }) => {
      syncContrastPaletteWithPreference()
    })
    .catch(() => {})
}

/**
 * Выставляет data-ergo-* на <html>.
 * Эффективные attrs + *-pref для выбора пользователя.
 */
export function applyUiModeAttributes({
  motion = readMotionPreference(),
  images = readImagesPreference(),
  contrast = readContrastPreference(),
  a11y = readA11yPreference(),
} = {}) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const motionReduce = resolveMotionActive(motion)
  const imagesOff = resolveImagesOff(images)
  const contrastMore = resolveContrastMore(contrast)

  root.setAttribute('data-ergo-motion-pref', motion)
  root.setAttribute('data-ergo-motion', motionReduce ? 'reduce' : 'full')
  root.setAttribute('data-ergo-images-pref', images)
  root.setAttribute('data-ergo-images', imagesOff ? 'off' : 'on')
  root.setAttribute('data-ergo-contrast-pref', contrast)
  root.setAttribute('data-ergo-contrast', contrastMore ? 'more' : 'normal')
  root.setAttribute('data-ergo-a11y', a11y === 'assist' ? 'assist' : 'default')

  notifyUiModesChange({
    motion,
    motionReduce,
    images,
    imagesOff,
    contrast,
    contrastMore,
    a11y,
    a11yAssist: a11y === 'assist',
    browserImagesDisabled,
  })

  syncContrastPaletteSideEffect()
}

function onSystemMotionChange() {
  if (readMotionPreference() !== 'system') return
  applyUiModeAttributes()
}

function onSystemContrastChange() {
  if (readContrastPreference() !== 'system') return
  applyUiModeAttributes()
}

/** Подписка на prefers-reduced-motion при preference=system. */
export function watchSystemMotionPreference() {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  if (systemMotionMql) {
    systemMotionMql.removeEventListener('change', onSystemMotionChange)
  }
  systemMotionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
  systemMotionMql.addEventListener('change', onSystemMotionChange)
  return () => {
    systemMotionMql?.removeEventListener('change', onSystemMotionChange)
    systemMotionMql = null
  }
}

/** Подписка на prefers-contrast / forced-colors при preference=system. */
export function watchSystemContrastPreference() {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}

  const detach = []

  if (systemContrastMql) {
    systemContrastMql.removeEventListener('change', onSystemContrastChange)
  }
  try {
    systemContrastMql = window.matchMedia('(prefers-contrast: more)')
    systemContrastMql.addEventListener('change', onSystemContrastChange)
    detach.push(() => systemContrastMql?.removeEventListener('change', onSystemContrastChange))
  } catch {
    systemContrastMql = null
  }

  if (forcedColorsMql) {
    forcedColorsMql.removeEventListener('change', onSystemContrastChange)
  }
  try {
    forcedColorsMql = window.matchMedia('(forced-colors: active)')
    forcedColorsMql.addEventListener('change', onSystemContrastChange)
    detach.push(() => forcedColorsMql?.removeEventListener('change', onSystemContrastChange))
  } catch {
    forcedColorsMql = null
  }

  return () => {
    detach.forEach((fn) => fn())
    systemContrastMql = null
    forcedColorsMql = null
  }
}

/** Вызов из Vue-бандла после загрузки (early bootstrap уже применил attrs). */
export function initUiPreferences() {
  applyUiModeAttributes()
  watchSystemMotionPreference()
  watchSystemContrastPreference()
  void probeBrowserImagesDisabled().then(() => {
    if (readImagesPreference() === 'system') {
      applyUiModeAttributes()
    }
  })
}
