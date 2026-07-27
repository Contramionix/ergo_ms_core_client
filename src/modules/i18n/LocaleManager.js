/**
 * Загрузка client/js/locales.js из модулей и merge в vue-i18n.
 */
import { ModuleLoader } from '@/modules/core/ModuleLoader.js'
import { i18n, SUPPORTED_LOCALES } from '@/i18n/index.js'

let mergePromise = null

export class LocaleManager extends ModuleLoader {
  /**
   * Подхватывает packs модулей и вызывает mergeLocaleMessage для каждого языка.
   */
  async mergeModuleLocales() {
    if (mergePromise) {
      return mergePromise
    }

    mergePromise = (async () => {
      const modules = await this.loadAllModulesAsync('js/locales.js')
      for (const [, mod] of Object.entries(modules)) {
        const pack = mod.default || mod
        if (!pack || typeof pack !== 'object') {
          continue
        }
        for (const locale of SUPPORTED_LOCALES) {
          const messages = pack[locale]
          if (messages && typeof messages === 'object') {
            i18n.global.mergeLocaleMessage(locale, messages)
          }
        }
      }
      return true
    })()

    return mergePromise
  }
}

let sharedManager = null

export function getLocaleManager() {
  if (!sharedManager) {
    sharedManager = new LocaleManager()
  }
  return sharedManager
}

export async function preloadModuleLocales() {
  return getLocaleManager().mergeModuleLocales()
}
