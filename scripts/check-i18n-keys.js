/**
 * Сверяет паритет ключей каталогов ядра для всех SUPPORTED_LOCALES.
 * Эталон ключей — ru. Запуск: ergoms npm run check-i18n
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesRoot = path.resolve(__dirname, '../src/i18n/locales')
const supportedPath = path.resolve(__dirname, '../src/i18n/supportedLocales.js')

function flattenKeys(obj, prefix = '', out = []) {
  if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
    if (prefix) out.push(prefix)
    return out
  }
  const keys = Object.keys(obj)
  if (!keys.length && prefix) {
    out.push(prefix)
    return out
  }
  for (const key of keys) {
    const next = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, next, out)
    } else {
      out.push(next)
    }
  }
  return out
}

async function loadLocale(locale) {
  const indexPath = path.join(localesRoot, locale, 'index.js')
  const mod = await import(pathToFileURL(indexPath).href)
  return mod.default || mod
}

function diffKeys(left, right) {
  const rightSet = new Set(right)
  return left.filter((key) => !rightSet.has(key)).sort()
}

async function loadSupportedLocales() {
  const mod = await import(pathToFileURL(supportedPath).href)
  const list = mod.SUPPORTED_LOCALES
  if (!Array.isArray(list) || !list.length) {
    throw new Error('SUPPORTED_LOCALES пуст или не найден')
  }
  return list
}

async function main() {
  const locales = await loadSupportedLocales()
  const baseLocale = locales.includes('ru') ? 'ru' : locales[0]

  if (!fs.existsSync(path.join(localesRoot, baseLocale, 'index.js'))) {
    console.error(`[ERROR] Не найден core/client/src/i18n/locales/${baseLocale}/index.js`)
    process.exit(1)
  }

  const base = await loadLocale(baseLocale)
  const baseKeys = flattenKeys(base)
  let failed = false
  const counts = { [baseLocale]: baseKeys.length }

  for (const locale of locales) {
    if (locale === baseLocale) continue
    const indexPath = path.join(localesRoot, locale, 'index.js')
    if (!fs.existsSync(indexPath)) {
      console.error(`[ERROR] Нет каталога локали: ${locale}`)
      failed = true
      continue
    }
    const messages = await loadLocale(locale)
    const keys = flattenKeys(messages)
    counts[locale] = keys.length

    const missing = diffKeys(baseKeys, keys)
    const extra = diffKeys(keys, baseKeys)
    if (missing.length) {
      failed = true
      console.error(`[ERROR] Ключи есть в ${baseLocale}, нет в ${locale} (${missing.length}):`)
      for (const key of missing.slice(0, 40)) {
        console.error(`  - ${key}`)
      }
      if (missing.length > 40) {
        console.error(`  … и ещё ${missing.length - 40}`)
      }
    }
    if (extra.length) {
      failed = true
      console.error(`[ERROR] Ключи есть в ${locale}, нет в ${baseLocale} (${extra.length}):`)
      for (const key of extra.slice(0, 40)) {
        console.error(`  - ${key}`)
      }
      if (extra.length > 40) {
        console.error(`  … и ещё ${extra.length - 40}`)
      }
    }
  }

  if (failed) {
    process.exit(1)
  }

  const summary = locales.map((l) => `${l}=${counts[l]}`).join(', ')
  console.log(`[OK] Паритет ключей i18n: ${summary}`)
}

main().catch((error) => {
  console.error('[ERROR] check-i18n-keys:', error)
  process.exit(1)
})
