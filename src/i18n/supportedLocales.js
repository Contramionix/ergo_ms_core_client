/** Поддерживаемые языки UI (коды = UserProfile.language / Accept-Language). */

/** Жёсткий запасной, если .env недоступен или код неизвестен. */
export const FALLBACK_LOCALE = 'ru'

export const SUPPORTED_LOCALES = ['ru', 'en', 'fr']

/** BCP-47 для Intl / localeCompare. */
export const LOCALE_BCP47 = {
  ru: 'ru-RU',
  en: 'en-US',
  fr: 'fr-FR',
}

export const LOCALE_META = {
  ru: { id: 'ru', name: 'Русский', nativeName: 'Русский' },
  en: { id: 'en', name: 'English', nativeName: 'English' },
  fr: { id: 'fr', name: 'Français', nativeName: 'Français' },
}

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale)
}

function readEnvDefaultLanguage() {
  try {
    const raw = import.meta.env?.CLIENT_DEFAULT_LANGUAGE
    if (raw != null && String(raw).trim() !== '') {
      return String(raw)
    }
  } catch {
    /* Node / check-i18n без Vite define */
  }
  return FALLBACK_LOCALE
}

/**
 * Язык по умолчанию из `.env` (`DEFAULT_LANGUAGE` → Vite `CLIENT_DEFAULT_LANGUAGE`).
 * Не путать с языком пользователя (профиль / localStorage).
 */
export function getDefaultLocale() {
  const base = readEnvDefaultLanguage().trim().toLowerCase().split(/[-_]/)[0]
  return isSupportedLocale(base) ? base : FALLBACK_LOCALE
}

export function normalizeLocale(locale) {
  if (!locale || typeof locale !== 'string') {
    return getDefaultLocale()
  }
  const base = locale.trim().toLowerCase().split(/[-_]/)[0]
  return isSupportedLocale(base) ? base : getDefaultLocale()
}

export function toBcp47(locale) {
  const normalized = normalizeLocale(locale)
  return LOCALE_BCP47[normalized] || LOCALE_BCP47[FALLBACK_LOCALE]
}

export function getLanguageOptions() {
  return SUPPORTED_LOCALES.map((id) => ({
    id,
    name: LOCALE_META[id].nativeName,
  }))
}
