/**
 * Реактивное отслеживание режима темы (light/dark) из единого theme-manager.
 * Слушает data-bs-theme, ergo:theme-change и prefers-color-scheme (режим auto).
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import {
  readThemePreference,
  resolveThemeMode,
  THEME_CHANGE_EVENT,
} from '@/js/theme-manager.js'

function readResolvedMode() {
  if (typeof document === 'undefined') {
    return resolveThemeMode(readThemePreference())
  }
  const attr = document.documentElement.getAttribute('data-bs-theme')
  if (attr === 'light' || attr === 'dark') {
    return attr
  }
  return resolveThemeMode(readThemePreference())
}

export function useThemeMode() {
  const preference = ref(readThemePreference())
  const resolvedMode = ref(readResolvedMode())
  const isDark = computed(() => resolvedMode.value === 'dark')
  const isLight = computed(() => resolvedMode.value === 'light')

  const sync = () => {
    preference.value = readThemePreference()
    resolvedMode.value = readResolvedMode()
  }

  let observer = null
  let mediaQuery = null

  onMounted(() => {
    sync()
    window.addEventListener(THEME_CHANGE_EVENT, sync)

    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(sync)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-bs-theme'],
      })
    }

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', sync)
  })

  onBeforeUnmount(() => {
    window.removeEventListener(THEME_CHANGE_EVENT, sync)
    observer?.disconnect()
    mediaQuery?.removeEventListener('change', sync)
  })

  return {
    preference,
    resolvedMode,
    isDark,
    isLight,
    sync,
  }
}
