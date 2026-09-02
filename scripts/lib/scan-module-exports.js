/**
 * Статический разбор ESM-экспортов hook-файла.
 * Нужен генератору federation-entry: Rolldown ругается на обращение
 * к default/имени, которого в модуле нет.
 */

const IDENT = '[A-Za-z_$][\\w$]*'

/**
 * Убирает комментарии и строковые литералы, чтобы `export` внутри них
 * не считался объявлением.
 * @param {string} source
 * @returns {string}
 */
export function stripJsNoise(source) {
  let out = ''
  let i = 0
  const n = source.length
  while (i < n) {
    const c = source[i]
    const next = source[i + 1]
    if (c === '/' && next === '/') {
      i += 2
      while (i < n && source[i] !== '\n') {
        i += 1
      }
      continue
    }
    if (c === '/' && next === '*') {
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        i += 1
      }
      i += 2
      out += ' '
      continue
    }
    if (c === "'" || c === '"') {
      const quote = c
      i += 1
      while (i < n) {
        if (source[i] === '\\') {
          i += 2
          continue
        }
        if (source[i] === quote) {
          i += 1
          break
        }
        i += 1
      }
      out += '""'
      continue
    }
    if (c === '`') {
      i += 1
      while (i < n) {
        if (source[i] === '\\') {
          i += 2
          continue
        }
        if (source[i] === '`') {
          i += 1
          break
        }
        i += 1
      }
      out += '""'
      continue
    }
    out += c
    i += 1
  }
  return out
}

/**
 * @param {string} specList
 * @param {{ hasDefault: boolean, named: Set<string> }} acc
 */
function collectExportSpecifiers(specList, acc) {
  for (const raw of specList.split(',')) {
    const spec = raw.trim()
    if (!spec) {
      continue
    }
    const asDefault = spec.match(new RegExp(`^(${IDENT})\\s+as\\s+default$`))
    if (asDefault) {
      acc.hasDefault = true
      continue
    }
    const asNamed = spec.match(new RegExp(`^(?:${IDENT}|default)\\s+as\\s+(${IDENT})$`))
    if (asNamed) {
      acc.named.add(asNamed[1])
      continue
    }
    if (spec === 'default') {
      acc.hasDefault = true
      continue
    }
    if (new RegExp(`^${IDENT}$`).test(spec)) {
      acc.named.add(spec)
    }
  }
}

/**
 * @param {string} source
 * @returns {{ hasDefault: boolean, named: string[], hasStarExport: boolean }}
 */
export function scanModuleExports(source) {
  const code = stripJsNoise(source)
  const acc = { hasDefault: false, named: new Set(), hasStarExport: false }

  if (/\bexport\s+default\b/.test(code)) {
    acc.hasDefault = true
  }

  const declRe = new RegExp(
    `\\bexport\\s+(?:async\\s+)?(?:const|let|var|function\\*?|class)\\s+(${IDENT})`,
    'g',
  )
  let match = declRe.exec(code)
  while (match) {
    acc.named.add(match[1])
    match = declRe.exec(code)
  }

  const braceRe = /\bexport\s*\{([^}]+)\}/g
  match = braceRe.exec(code)
  while (match) {
    collectExportSpecifiers(match[1], acc)
    match = braceRe.exec(code)
  }

  if (/\bexport\s+\*(?!\s+as\b)/.test(code)) {
    acc.hasStarExport = true
  }

  const starAsRe = new RegExp(`\\bexport\\s+\\*\\s+as\\s+(${IDENT})`, 'g')
  match = starAsRe.exec(code)
  while (match) {
    acc.named.add(match[1])
    match = starAsRe.exec(code)
  }

  return {
    hasDefault: acc.hasDefault,
    named: [...acc.named],
    hasStarExport: acc.hasStarExport,
  }
}
