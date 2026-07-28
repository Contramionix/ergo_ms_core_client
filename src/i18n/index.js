import { createI18n } from 'vue-i18n'

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

const localeLoaders = {
  ru: () => import('./locales/ru/index.js'),
  en: () => import('./locales/en/index.js'),
  fr: () => import('./locales/fr/index.js'),
}

const loadedCoreLocales = new Set()
const coreLocalePromises = new Map()

/**
 * Подгружает каталог ядра для locale (кэш промисов).
 * @param {string} locale
 * @returns {Promise<string>}
 */
export async function ensureLocaleLoaded(locale) {
  const normalized = normalizeLocale(locale)
  if (loadedCoreLocales.has(normalized)) {
    return normalized
  }
  if (coreLocalePromises.has(normalized)) {
    await coreLocalePromises.get(normalized)
    return normalized
  }

  const loader = localeLoaders[normalized]
  if (!loader) {
    return ensureLocaleLoaded(FALLBACK_LOCALE)
  }

  const promise = (async () => {
    const mod = await loader()
    const messages = mod.default || mod
    i18n.global.setLocaleMessage(normalized, messages)
    loadedCoreLocales.add(normalized)
  })()

  coreLocalePromises.set(normalized, promise)
  try {
    await promise
  } finally {
    coreLocalePromises.delete(normalized)
  }
  return normalized
}

/**
 * Стартовые каталоги: активный язык + fallback (если другой).
 * @returns {Promise<string>} активный locale
 */
export async function ensureBootLocales() {
  const active = readInitialLocale()
  const tasks = [ensureLocaleLoaded(active)]
  if (active !== FALLBACK_LOCALE) {
    tasks.push(ensureLocaleLoaded(FALLBACK_LOCALE))
  }
  await Promise.all(tasks)
  applyLocale(active)
  return active
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: initialLocale,
  fallbackLocale: FALLBACK_LOCALE,
  messages: {},
  pluralRules: {
    ru: russianPluralRule,
    en: englishPluralRule,
    fr: englishPluralRule,
  },
})

/**
 * Стартует при оценке модуля i18n — не ждать body main.js.
 * На Vite dev + Slow 3G иначе locale оказывается в конце очереди HTTP/1.1 (~40s в HAR).
 */
export const bootLocalesPromise = ensureBootLocales()

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
 * Синхронно применяет locale (без загрузки каталогов).
 * @param {string} locale
 * @returns {string}
 */
export function applyLocale(locale) {
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

let onLocaleMessagesReady = null

/**
 * Хук для догрузки модульных каталогов при смене языка (LocaleManager).
 * @param {(locale: string) => Promise<void>} handler
 */
export function setLocaleMessagesReadyHandler(handler) {
  onLocaleMessagesReady = typeof handler === 'function' ? handler : null
}

/**
 * Устанавливает язык UI: подгрузка каталогов, vue-i18n, <html lang>, событие.
 * @param {string} locale
 * @returns {Promise<string>} нормализованный код
 */
export async function setAppLocale(locale) {
  const normalized = normalizeLocale(locale)
  const tasks = [ensureLocaleLoaded(normalized)]
  if (normalized !== FALLBACK_LOCALE) {
    tasks.push(ensureLocaleLoaded(FALLBACK_LOCALE))
  }
  await Promise.all(tasks)
  applyLocale(normalized)
  if (onLocaleMessagesReady) {
    try {
      await onLocaleMessagesReady(normalized)
    } catch {
      /* модульные каталоги не блокируют смену языка ядра */
    }
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
