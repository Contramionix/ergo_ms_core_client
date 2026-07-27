import { createI18n } from 'vue-i18n'

import ru from './locales/ru/index.js'
import en from './locales/en/index.js'
import fr from './locales/fr/index.js'
import {
  FALLBACK_LOCALE,
  getDefaultLocale,
  normalizeLocale,
  toBcp47,
} from './supportedLocales.js'

function readInitialLocale() {
  if (typeof localStorage === 'undefined') {
    return getDefaultLocale()
  }
  try {
    const stored = localStorage.getItem('language')
    if (stored) {
      return normalizeLocale(stored)
    }
    return getDefaultLocale()
  } catch {
    return getDefaultLocale()
  }
}

const initialLocale = readInitialLocale()

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: FALLBACK_LOCALE,
  messages: {
    ru,
    en,
    fr,
  },
  pluralRules: {
    ru: russianPluralRule,
    en: englishPluralRule,
    fr: englishPluralRule,
  },
})

/** Правила множественного числа для vue-i18n (ru: 3 формы). */
function russianPluralRule(choice, choicesLength) {
  if (choicesLength === 1) {
    return 0
  }
  if (choicesLength === 2) {
    return choice === 1 ? 0 : 1
  }
  const n = Math.abs(choice)
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) {
    return 0
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 1
  }
  return 2
}

function englishPluralRule(choice, choicesLength) {
  if (choicesLength === 1) {
    return 0
  }
  return choice === 1 ? 0 : 1
}

export function getI18n() {
  return i18n
}

export function tGlobal(key, ...args) {
  return i18n.global.t(key, ...args)
}

export function teGlobal(key) {
  return i18n.global.te(key)
}

export function getCurrentLocale() {
  const locale = i18n.global.locale
  return normalizeLocale(typeof locale === 'string' ? locale : locale.value)
}

export function getCurrentBcp47() {
  return toBcp47(getCurrentLocale())
}

/**
 * Устанавливает язык UI: vue-i18n, <html lang>, событие ergo:locale-change.
 * @param {string} locale
 * @returns {string} нормализованный код
 */
export function setAppLocale(locale) {
  const normalized = normalizeLocale(locale)
  const current = i18n.global.locale
  if (typeof current === 'object' && 'value' in current) {
    current.value = normalized
  } else {
    i18n.global.locale = normalized
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ergo:locale-change', { detail: { locale: normalized } }),
    )
  }

  return normalized
}

export {
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_META,
  getDefaultLocale,
  normalizeLocale,
  isSupportedLocale,
  toBcp47,
  getLanguageOptions,
} from './supportedLocales.js'
