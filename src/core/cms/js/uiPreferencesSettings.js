/**
 * Реактивные настройки режимов UI для SystemPanel (localStorage + data-ergo-*).
 */

import { ref, watch, computed } from 'vue'
import {
  applyUiModeAttributes,
  probeBrowserImagesDisabled,
  readA11yPreference,
  readContrastPreference,
  readImagesPreference,
  readMotionPreference,
  writeA11yPreference,
  writeContrastPreference,
  writeImagesPreference,
  writeMotionPreference,
} from '@/js/uiPreferences.js'
import { tGlobal } from '@/i18n/index.js'

export const MOTION_OPTIONS = computed(() => [
  { id: 'system', name: tGlobal('settings.system.motionSystem'), icon: 'LaptopMinimal' },
  { id: 'reduce', name: tGlobal('settings.system.motionReduce'), icon: 'ZapOff' },
  { id: 'full', name: tGlobal('settings.system.motionFull'), icon: 'Zap' },
])

export const IMAGES_OPTIONS = computed(() => [
  { id: 'system', name: tGlobal('settings.system.imagesSystem'), icon: 'LaptopMinimal' },
  { id: 'on', name: tGlobal('settings.system.imagesOn'), icon: 'Image' },
  { id: 'off', name: tGlobal('settings.system.imagesOff'), icon: 'ImageOff' },
])

export const CONTRAST_OPTIONS = computed(() => [
  { id: 'system', name: tGlobal('settings.system.contrastSystem'), icon: 'LaptopMinimal' },
  { id: 'more', name: tGlobal('settings.system.contrastMore'), icon: 'Contrast' },
  { id: 'normal', name: tGlobal('settings.system.contrastNormal'), icon: 'SunMedium' },
])

export const A11Y_OPTIONS = computed(() => [
  { id: 'default', name: tGlobal('settings.system.a11yOff'), icon: 'CircleUser' },
  { id: 'assist', name: tGlobal('settings.system.a11yAssist'), icon: 'Accessibility' },
])

const motion = ref(readMotionPreference())
const images = ref(readImagesPreference())
const contrast = ref(readContrastPreference())
const a11y = ref(readA11yPreference())

watch(motion, (val) => {
  writeMotionPreference(val)
  applyUiModeAttributes({
    motion: val,
    images: images.value,
    contrast: contrast.value,
    a11y: a11y.value,
  })
})

watch(images, (val) => {
  writeImagesPreference(val)
  applyUiModeAttributes({
    motion: motion.value,
    images: val,
    contrast: contrast.value,
    a11y: a11y.value,
  })
  if (val === 'system') {
    void probeBrowserImagesDisabled().then(() => {
      applyUiModeAttributes({
        motion: motion.value,
        images: 'system',
        contrast: contrast.value,
        a11y: a11y.value,
      })
    })
  }
})

watch(contrast, (val) => {
  writeContrastPreference(val)
  applyUiModeAttributes({
    motion: motion.value,
    images: images.value,
    contrast: val,
    a11y: a11y.value,
  })
})

watch(a11y, (val) => {
  writeA11yPreference(val)
  applyUiModeAttributes({
    motion: motion.value,
    images: images.value,
    contrast: contrast.value,
    a11y: val,
  })
})

export function syncUiPreferencesFromStorage() {
  motion.value = readMotionPreference()
  images.value = readImagesPreference()
  contrast.value = readContrastPreference()
  a11y.value = readA11yPreference()
  applyUiModeAttributes({
    motion: motion.value,
    images: images.value,
    contrast: contrast.value,
    a11y: a11y.value,
  })
}

export function useUiPreferencesSettings() {
  return {
    motion,
    images,
    contrast,
    a11y,
    MOTION_OPTIONS,
    IMAGES_OPTIONS,
    CONTRAST_OPTIONS,
    A11Y_OPTIONS,
  }
}
