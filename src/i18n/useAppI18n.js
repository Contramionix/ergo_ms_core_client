import { useI18n } from 'vue-i18n'

import { getCurrentBcp47, getCurrentLocale, setAppLocale } from './index.js'
import { normalizeLocale, toBcp47 } from './supportedLocales.js'

/**
 * Обёртка над useI18n с хелперами локали ERGO MS.
 */
export function useAppI18n(options) {
  const i18n = useI18n(options)

  return {
    ...i18n,
    setLocale: setAppLocale,
    getLocale: getCurrentLocale,
    getBcp47: getCurrentBcp47,
    normalizeLocale,
    toBcp47,
  }
}
