/**
 * Локализованные подписи системных тем каталога.
 * Ключ — каноническое имя в БД (ru), см. theme_seed_catalog.py.
 */

import { getI18n } from '@/i18n/index.js'

function readCatalog(section, tmFn) {
  const tm = tmFn || ((key) => getI18n().global.tm(key))
  const catalog = tm(`settings.themes.${section}`)
  if (catalog && typeof catalog === 'object' && !Array.isArray(catalog)) {
    return catalog
  }
  return null
}

function lookup(section, name, tmFn) {
  const raw = String(name || '').trim()
  if (!raw) {
    return ''
  }
  const catalog = readCatalog(section, tmFn)
  const value = catalog?.[raw]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

/** Отображаемое имя темы; для кастомных — как в БД. */
export function resolveThemeDisplayName(name, tmFn = null) {
  return lookup('systemNames', name, tmFn) || String(name || '').trim()
}

/** Описание системной темы; иначе fallback из API. */
export function resolveThemeDisplayDescription(name, fallback = '', tmFn = null) {
  return lookup('systemDescriptions', name, tmFn) || String(fallback || '').trim()
}

const SYSTEM_AUTHOR_SENTINEL = 'system'

function tThemes(key, tFn) {
  const t = tFn || ((k) => getI18n().global.t(k))
  return String(t(`settings.themes.${key}`) || '').trim()
}

/** Автор для UI: sentinel System → локализованная подпись. */
export function resolveThemeDisplayAuthor(author, tFn = null) {
  const raw = String(author || '').trim()
  if (raw.toLowerCase() === SYSTEM_AUTHOR_SENTINEL) {
    return tThemes('authorSystem', tFn)
  }
  return raw
}

/**
 * Автор для API/БД: локализованная «Система» / System → канонический sentinel.
 * Кастомный текст сохраняется как есть.
 */
export function normalizeThemeAuthorForSave(author, tFn = null) {
  const raw = String(author || '').trim()
  if (!raw) {
    return ''
  }
  if (raw.toLowerCase() === SYSTEM_AUTHOR_SENTINEL) {
    return 'System'
  }
  if (raw === tThemes('authorSystem', tFn)) {
    return 'System'
  }
  return raw
}
