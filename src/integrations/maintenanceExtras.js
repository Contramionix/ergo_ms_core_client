/**
 * Реестр дополнений страницы обслуживания.
 *
 * Модули: bridge.provideMany(MAINTENANCE_EXTRAS_GROUP, key, { id, component, order? }).
 * Ядро монтирует их на странице обслуживания — без знания домена модуля.
 */

import bridge from '@/integrations/ModuleBridge.js'
import { MAINTENANCE_EXTRAS_GROUP } from '@/integrations/moduleContracts.js'
import { moduleManager } from '@/modules/index.js'

export { MAINTENANCE_EXTRAS_GROUP }

/**
 * @typedef {Object} MaintenanceExtraRegistration
 * @property {string} id
 * @property {import('vue').Component} component
 * @property {number} [order]
 */

/**
 * @returns {Promise<MaintenanceExtraRegistration[]>}
 */
export async function collectMaintenanceExtras() {
  await moduleManager.ensureInitialized()

  return Object.values(bridge.all(MAINTENANCE_EXTRAS_GROUP))
    .filter((extra) => extra?.id && extra?.component)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
