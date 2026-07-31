/**
 * Реестр плавающих виджетов оболочки (мини-чат и т.п.).
 *
 * Модули: bridge.provideMany(FLOATING_WIDGETS_GROUP, key, { id, component, order? }).
 * Ядро монтирует их в LayoutMenu через FloatingWidgetsHost — без LayoutPlugin.
 */

import bridge from '@/integrations/ModuleBridge.js'
import { moduleManager } from '@/modules/index.js'

export const FLOATING_WIDGETS_GROUP = 'shell.floating_widgets'

/**
 * @typedef {Object} FloatingWidgetRegistration
 * @property {string} id
 * @property {import('vue').Component} component
 * @property {number} [order]
 */

/**
 * @returns {Promise<FloatingWidgetRegistration[]>}
 */
export async function collectFloatingWidgets() {
  if (!moduleManager.initialized) {
    await moduleManager.initialize()
  }

  return Object.values(bridge.all(FLOATING_WIDGETS_GROUP))
    .filter((widget) => widget?.id && widget?.component)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
