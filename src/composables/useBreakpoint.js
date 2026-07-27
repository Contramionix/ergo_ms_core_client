/**
 * Единые брейкпоинты Bootstrap 5 (в px, min-width).
 * sm 576 / md 768 / lg 992 / xl 1200 / xxl 1400
 */

import { computed, onMounted, onUnmounted, ref } from 'vue'

export const BREAKPOINTS = {
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
}

/** Десктопная оболочка меню (как раньше innerWidth >= 1200). */
export const SHELL_DESKTOP_MIN = BREAKPOINTS.xl

function readWidth() {
  if (typeof window === 'undefined') return SHELL_DESKTOP_MIN
  return window.innerWidth
}

function applyLayoutAttr(width) {
  if (typeof document === 'undefined') return
  const compact = width < SHELL_DESKTOP_MIN
  document.documentElement.setAttribute('data-ergo-layout', compact ? 'compact' : 'wide')
}

const width = ref(readWidth())
let resizeListenerCount = 0
let resizeRaf = null

function onResize() {
  if (resizeRaf != null) return
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null
    width.value = readWidth()
    applyLayoutAttr(width.value)
  })
}

function ensureResizeListener() {
  if (typeof window === 'undefined') return
  if (resizeListenerCount === 0) {
    window.addEventListener('resize', onResize, { passive: true })
    applyLayoutAttr(width.value)
  }
  resizeListenerCount += 1
}

function releaseResizeListener() {
  if (typeof window === 'undefined') return
  resizeListenerCount = Math.max(0, resizeListenerCount - 1)
  if (resizeListenerCount === 0) {
    window.removeEventListener('resize', onResize)
  }
}

export function useBreakpoint() {
  onMounted(() => {
    width.value = readWidth()
    ensureResizeListener()
  })
  onUnmounted(() => {
    releaseResizeListener()
  })

  const isSmUp = computed(() => width.value >= BREAKPOINTS.sm)
  const isMdUp = computed(() => width.value >= BREAKPOINTS.md)
  const isLgUp = computed(() => width.value >= BREAKPOINTS.lg)
  const isXlUp = computed(() => width.value >= BREAKPOINTS.xl)
  const isXxlUp = computed(() => width.value >= BREAKPOINTS.xxl)
  const isShellDesktop = computed(() => width.value >= SHELL_DESKTOP_MIN)
  const isCompactLayout = computed(() => width.value < SHELL_DESKTOP_MIN)

  return {
    width,
    breakpoints: BREAKPOINTS,
    isSmUp,
    isMdUp,
    isLgUp,
    isXlUp,
    isXxlUp,
    isShellDesktop,
    isCompactLayout,
  }
}

/** Синхронно вне setup. */
export function isShellDesktopWidth() {
  return readWidth() >= SHELL_DESKTOP_MIN
}
