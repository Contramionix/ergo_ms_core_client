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
