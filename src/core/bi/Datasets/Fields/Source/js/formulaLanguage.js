import { StreamLanguage } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const FORMULA_KEYWORDS = new Set([
  'SUM', 'AVG', 'COUNT', 'ROUND', 'IF', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CONCAT', 'DATE_TRUNC', 'COALESCE', 'NVL', 'CEIL', 'FLOOR', 'SUBSTR',
  'CAST', 'NOW', 'ROW_NUMBER', 'RANK', 'OVER', 'PARTITION', 'BY', 'AS',
  'INTEGER', 'NUMERIC', 'TEXT', 'BOOL', 'DATE', 'TRUE', 'FALSE', 'NULL',
  'ARRAY_LENGTH', 'UNNEST', 'TO_CHAR', 'UCCOUNT', 'MIN', 'MAX'
])

function tokenFormula(stream) {
  stream.eatSpace()
  if (stream.eol()) return null

  const ch = stream.peek()

  if (ch === '[') {
    stream.next()
    stream.eatWhile(c => c !== ']' && c !== '\n')
    if (stream.peek() === ']') stream.next()
    return 'variableName'
  }

  if (ch === '"' || ch === "'") {
    const quote = ch
    stream.next()
    while (!stream.eol()) {
      const c = stream.next()
      if (c === quote && stream.peek() !== quote) break
      if (c === '\\') stream.next()
    }
    return 'string'
  }

  if (/[0-9.]/.test(ch)) {
    stream.eatWhile(/[0-9.]/)
    return 'number'
  }

  if (/[a-zA-Z_\u0400-\u04FF]/.test(ch)) {
    stream.eatWhile(/[a-zA-Z0-9_\u0400-\u04FF]/)
    const word = stream.current().toUpperCase()
    if (FORMULA_KEYWORDS.has(word)) return 'keyword'
    return null
  }

  if (/[=<>!]/.test(ch)) {
    stream.next()
    if (ch === '<' && stream.eat('>')) return 'operator'
    if ((ch === '=' || ch === '<' || ch === '>') && stream.eat('=')) return 'operator'
    return 'operator'
  }
  if (/[+\-*\/%,()]/.test(ch)) {
    stream.next()
    return 'operator'
  }

  stream.next()
  return null
}

export const formulaLanguage = StreamLanguage.define({
  name: 'formula',
  startState: () => ({}),
  token(stream, state) {
    return tokenFormula(stream)
  },
  tokenTable: {
    keyword: tags.keyword,
    string: tags.string,
    number: tags.number,
    variableName: tags.variableName,
    operator: tags.operator,
    bracket: tags.bracket
  }
})
