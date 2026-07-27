/**
 * Vue-плагин auto-animate с учётом data-ergo-motion / prefers-reduced-motion.
 */

import autoAnimate from '@formkit/auto-animate'
import { UI_MODES_CHANGE_EVENT, resolveMotionActive } from '@/js/uiPreferences.js'

function createGatedVAutoAnimate(defaults) {
  return {
    mounted(el, binding) {
      let resolved = {}
      const local = binding.value
      if (typeof local === 'function') {
        resolved = local
      } else if (typeof defaults === 'function') {
        resolved = defaults
      } else {
        resolved = { ...(defaults || {}), ...(local || {}) }
      }

      const ctl = autoAnimate(el, {
        ...resolved,
        // OS preference учитывает библиотека; наш reduce — через enable/disable
        disrespectUserMotionPreference: false,
      })
      Object.defineProperty(el, '__aa_ctl', { value: ctl, configurable: true })

      const sync = () => {
        if (resolveMotionActive()) {
          ctl.disable?.()
        } else {
          ctl.enable?.()
        }
      }
      sync()
      window.addEventListener(UI_MODES_CHANGE_EVENT, sync)
      Object.defineProperty(el, '__aa_sync', { value: sync, configurable: true })
    },
    unmounted(el) {
      const sync = el.__aa_sync
      if (sync) {
        window.removeEventListener(UI_MODES_CHANGE_EVENT, sync)
      }
      el.__aa_ctl?.destroy?.()
      try {
        delete el.__aa_ctl
        delete el.__aa_sync
      } catch {
        /* ignore */
      }
    },
    getSSRProps: () => ({}),
  }
}

export const gatedAutoAnimatePlugin = {
  install(app, defaults) {
    app.directive('auto-animate', createGatedVAutoAnimate(defaults))
  },
}
