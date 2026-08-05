/**
 * Нормализация поискового запроса на клиенте (статические списки).
 * Правила совпадают с core.search.query на сервере: trim, пробелы, раскладка EN↔RU.
 */

const EN_KEYS = '`qwertyuiop[]asdfghjkl;\'zxcvbnm,./~QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>?'
const RU_KEYS = 'ёйцукенгшщзхъфывапролджэячсмитьбю.ЁЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,'

const LAYOUT_MAP = new Map()
for (let i = 0; i < EN_KEYS.length; i += 1) {
  LAYOUT_MAP.set(EN_KEYS[i], RU_KEYS[i])
  LAYOUT_MAP.set(RU_KEYS[i], EN_KEYS[i])
}

const LATIN_CHARS = new Set(EN_KEYS.split(''))
const CYRILLIC_CHARS = new Set(RU_KEYS.split(''))

export function normalizeSearchQuery(raw) {
  return String(raw || '').trim().split(/\s+/).filter(Boolean).join(' ')
}

export function swapKeyboardLayout(text, { only = null } = {}) {
  if (!text) {
    return text
  }
  let charset = null
  if (only === 'latin') {
    charset = LATIN_CHARS
  } else if (only === 'cyrillic') {
    charset = CYRILLIC_CHARS
  }
  return [...text].map((ch) => {
    if (charset && !charset.has(ch)) {
      return ch
    }
    return LAYOUT_MAP.get(ch) ?? ch
  }).join('')
}

export function searchLayoutVariants(text) {
  const normalized = normalizeSearchQuery(text)
  if (!normalized) {
    return []
  }
  const variants = []
  const seen = new Set()
  const add = (value) => {
    if (value && !seen.has(value)) {
      seen.add(value)
      variants.push(value)
    }
  }
  add(normalized)
  add(swapKeyboardLayout(normalized))
  add(swapKeyboardLayout(normalized, { only: 'latin' }))
  add(swapKeyboardLayout(normalized, { only: 'cyrillic' }))
  return variants
}

/**
 * Проверяет, подходит ли строка под поисковый запрос (с учётом раскладки).
 * @param {string} haystack
 * @param {string} query
 */
export function matchSearchQuery(haystack, query) {
  const normalized = normalizeSearchQuery(query)
  if (!normalized) {
    return true
  }
  const target = String(haystack ?? '').toLowerCase()
  if (!target) {
    return false
  }
  return searchLayoutVariants(normalized).some((variant) => target.includes(variant.toLowerCase()))
}
