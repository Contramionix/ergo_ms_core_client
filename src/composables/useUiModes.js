/**
 * Реактивный доступ к режимам UI (анимации, картинки, контраст, помощь диктору).
 * Источник истины — data-ergo-* на <html> + localStorage через uiPreferences.
 */

import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  UI_MODES_CHANGE_EVENT,
  applyUiModeAttributes,
  isA11yAssist,
  isImagesOff,
  probeBrowserImagesDisabled,
  readA11yPreference,
  readContrastPreference,
  readImagesPreference,
  readMotionPreference,
  resolveContrastMore,
  resolveMotionActive,
  writeA11yPreference,
  writeContrastPreference,
  writeImagesPreference,
  writeMotionPreference,
} from '@/js/uiPreferences.js'

function snapshotFromDom() {
  const root = typeof document !== 'undefined' ? document.documentElement : null
  const motionPref = root?.getAttribute('data-ergo-motion-pref') || readMotionPreference()
  const imagesPref = root?.getAttribute('data-ergo-images-pref') || readImagesPreference()
  const imagesEffective = root?.getAttribute('data-ergo-images')
  const contrastPref = root?.getAttribute('data-ergo-contrast-pref') || readContrastPreference()
  const contrastEffective = root?.getAttribute('data-ergo-contrast')
  const a11y = root?.getAttribute('data-ergo-a11y') || readA11yPreference()
  return {
    motion: motionPref,
    motionReduce: root?.getAttribute('data-ergo-motion') === 'reduce' || resolveMotionActive(motionPref),
    images: imagesPref,
    imagesOff: imagesEffective === 'off' || isImagesOff(imagesPref),
    contrast: contrastPref,
    contrastMore: contrastEffective === 'more' || resolveContrastMore(contrastPref),
    a11y,
    a11yAssist: a11y === 'assist' || isA11yAssist(a11y),
  }
}

const state = ref(snapshotFromDom())

function syncFromEvent(event) {
  if (event?.detail) {
    state.value = {
      motion: event.detail.motion,
      motionReduce: event.detail.motionReduce,
      images: event.detail.images,
      imagesOff: event.detail.imagesOff,
      contrast: event.detail.contrast,
      contrastMore: event.detail.contrastMore,
      a11y: event.detail.a11y,
      a11yAssist: event.detail.a11yAssist,
    }
    return
  }
  state.value = snapshotFromDom()
}

let listeners = 0

function ensureListener() {
  if (typeof window === 'undefined') return
  if (listeners === 0) {
    window.addEventListener(UI_MODES_CHANGE_EVENT, syncFromEvent)
  }
  listeners += 1
}

function releaseListener() {
  if (typeof window === 'undefined') return
  listeners = Math.max(0, listeners - 1)
  if (listeners === 0) {
    window.removeEventListener(UI_MODES_CHANGE_EVENT, syncFromEvent)
  }
}

export function useUiModes() {
  onMounted(() => {
    ensureListener()
    state.value = snapshotFromDom()
  })
  onUnmounted(() => {
    releaseListener()
  })

  const reducedMotionActive = computed(() => state.value.motionReduce)
  const imagesOff = computed(() => state.value.imagesOff)
  const contrastMore = computed(() => state.value.contrastMore)
  const a11yAssist = computed(() => state.value.a11yAssist)
  const motionPreference = computed(() => state.value.motion)
  const imagesPreference = computed(() => state.value.images)
  const contrastPreference = computed(() => state.value.contrast)
  const a11yPreference = computed(() => state.value.a11y)

  function setMotionPreference(mode) {
    writeMotionPreference(mode)
    applyUiModeAttributes({ motion: mode })
  }

  function setImagesPreference(mode) {
    writeImagesPreference(mode)
    applyUiModeAttributes({ images: mode })
    if (mode === 'system') {
      void probeBrowserImagesDisabled().then(() => {
        applyUiModeAttributes({ images: 'system' })
      })
    }
  }

  function setContrastPreference(mode) {
    writeContrastPreference(mode)
    applyUiModeAttributes({ contrast: mode })
  }

  function setA11yPreference(mode) {
    writeA11yPreference(mode)
    applyUiModeAttributes({ a11y: mode })
  }

  return {
    reducedMotionActive,
    imagesOff,
    contrastMore,
    a11yAssist,
    motionPreference,
    imagesPreference,
    contrastPreference,
    a11yPreference,
    setMotionPreference,
    setImagesPreference,
    setContrastPreference,
    setA11yPreference,
  }
}

/** Синхронная проверка вне setup (handlers, utils). */
export function getReducedMotionActive() {
  return resolveMotionActive()
}

export function getContrastMoreActive() {
  return resolveContrastMore()
}
