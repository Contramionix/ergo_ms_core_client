/**
 * Режим light/dark внутри ModuleThemeScope (не глобальный html).
 */
import { ref, computed, onMounted, onBeforeUnmount, inject } from 'vue'
import { MODULE_THEME_CHANGE_EVENT } from '@/js/module-theme-manager.js'

function readScopedMode(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') {
    return 'light'
  }
  const el = document.querySelector(`[data-ergo-module-theme="${moduleKey}"]`)
  const attr = el?.getAttribute('data-bs-theme')
  return attr === 'dark' ? 'dark' : 'light'
}

export function useModuleThemeMode(explicitModuleKey = null) {
  const injectedKey = inject('ergoModuleThemeKey', null)
  const moduleKey = explicitModuleKey || injectedKey

  const resolvedMode = ref(readScopedMode(moduleKey))
  const isDark = computed(() => resolvedMode.value === 'dark')
  const isLight = computed(() => resolvedMode.value === 'light')

  const sync = () => {
    resolvedMode.value = readScopedMode(moduleKey)
  }

  let observer = null

  onMounted(() => {
    sync()
    window.addEventListener(MODULE_THEME_CHANGE_EVENT, sync)

    if (moduleKey && typeof MutationObserver !== 'undefined') {
      const el = document.querySelector(`[data-ergo-module-theme="${moduleKey}"]`)
      if (el) {
        observer = new MutationObserver(sync)
        observer.observe(el, {
          attributes: true,
          attributeFilter: ['data-bs-theme'],
        })
      }
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener(MODULE_THEME_CHANGE_EVENT, sync)
    observer?.disconnect()
  })

  return {
    moduleKey,
    resolvedMode,
    isDark,
    isLight,
    sync,
  }
}
