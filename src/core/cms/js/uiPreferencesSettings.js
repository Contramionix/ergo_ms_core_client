/**
 * Реактивные настройки режимов UI для SystemPanel (localStorage + data-ergo-*).
 */

import { ref, watch, markRaw } from 'vue'
import {
  LaptopMinimal,
  Zap,
  ZapOff,
  Image,
  ImageOff,
  Accessibility,
  CircleUser,
  Contrast,
  SunMedium,
} from 'lucide-vue-next'
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

export const MOTION_OPTIONS = [
  { id: 'system', name: 'Как в системе', icon: markRaw(LaptopMinimal) },
  { id: 'reduce', name: 'Без анимаций', icon: markRaw(ZapOff) },
  { id: 'full', name: 'С анимациями', icon: markRaw(Zap) },
]

export const IMAGES_OPTIONS = [
  { id: 'system', name: 'Как в браузере', icon: markRaw(LaptopMinimal) },
  { id: 'on', name: 'Показывать', icon: markRaw(Image) },
  { id: 'off', name: 'Скрыть картинки', icon: markRaw(ImageOff) },
]

export const CONTRAST_OPTIONS = [
  { id: 'system', name: 'Как в системе', icon: markRaw(LaptopMinimal) },
  { id: 'more', name: 'Высокий контраст', icon: markRaw(Contrast) },
  { id: 'normal', name: 'Обычный контраст', icon: markRaw(SunMedium) },
]

export const A11Y_OPTIONS = [
  { id: 'default', name: 'Выключен', icon: markRaw(CircleUser) },
  { id: 'assist', name: 'Включён', icon: markRaw(Accessibility) },
]

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
