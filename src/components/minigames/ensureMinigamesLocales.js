import {
  bootLocalesPromise,
  FALLBACK_LOCALE,
  getCurrentLocale,
  i18n,
} from '@/i18n/index.js'
import pack from './locales.js'

function mergeKnownLocales() {
  const wanted = new Set([getCurrentLocale(), FALLBACK_LOCALE])
  for (const locale of wanted) {
    const messages = pack[locale]
    if (messages && typeof messages === 'object') {
      i18n.global.mergeLocaleMessage(locale, messages)
    }
  }
}

mergeKnownLocales()
void bootLocalesPromise.then(mergeKnownLocales)

if (typeof window !== 'undefined') {
  window.addEventListener('ergo:locale-change', mergeKnownLocales)
}

export function ensureMinigamesLocales() {
  mergeKnownLocales()
}
