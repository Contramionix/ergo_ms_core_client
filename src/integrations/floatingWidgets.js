/**
 * Реестр плавающих виджетов оболочки (мини-чат и т.п.).
 *
 * Модули: bridge.provideMany(FLOATING_WIDGETS_GROUP, key, { id, component, order?, isVisible? }).
 * Ядро монтирует их в LayoutMenu через FloatingWidgetsHost — без LayoutPlugin.
 */

import bridge from '@/integrations/ModuleBridge.js'
import { FLOATING_WIDGETS_GROUP } from '@/integrations/moduleContracts.js'
import { moduleManager } from '@/modules/index.js'

export { FLOATING_WIDGETS_GROUP }

/**
 * @typedef {Object} FloatingWidgetRegistration
 * @property {string} id
 * @property {import('vue').Component} component
 * @property {number} [order]
 * @property {() => boolean | Promise<boolean>} [isVisible]
 */

/**
 * @returns {Promise<FloatingWidgetRegistration[]>}
 */
export async function collectFloatingWidgets() {
  if (!moduleManager.initialized) {
    await moduleManager.initialize()
  }

  const registered = Object.values(bridge.all(FLOATING_WIDGETS_GROUP))
    .filter((widget) => widget?.id && widget?.component)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const visible = []
  for (const widget of registered) {
    if (typeof widget.isVisible === 'function') {
      const show = await widget.isVisible()
      if (!show) {
        continue
      }
    }
    visible.push(widget)
  }
  return visible
}
