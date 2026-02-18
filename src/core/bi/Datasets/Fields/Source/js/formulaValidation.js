/**
 * Валидация формулы на клиенте: ссылки [Имя], сбалансированность скобок.
 * Не дублирует полную логику бэкенда (formula_to_sql), только базовые проверки.
 *
 * @param {string} expression - строка формулы
 * @param {{ name: string }[]} fields - доступные поля (name)
 * @param {Array<string|{ name: string }>} params - доступные параметры (имя или объект с name)
 * @returns {{ valid: boolean, errors: Array<{ message: string, from?: number, to?: number }> }}
 */
export function validateFormula(expression, fields = [], params = []) {
  const errors = []
  const str = typeof expression === 'string' ? expression : ''

  const allowedNames = new Set()
  for (const f of fields) {
    const name = f && (f.name ?? f)
    if (name != null && String(name).trim() !== '') allowedNames.add(String(name).trim())
  }
  for (const p of params) {
    const name = typeof p === 'string' ? p : (p && p.name)
    if (name != null && String(name).trim() !== '') allowedNames.add(String(name).trim())
  }

  const bracketStack = []
  const squareStack = []
  let i = 0
  const n = str.length

  while (i < n) {
    const ch = str[i]
    if (ch === '(') {
      bracketStack.push(i)
      i += 1
      continue
    }
    if (ch === ')') {
      if (bracketStack.length === 0) {
        errors.push({ message: 'Лишняя закрывающая скобка )', from: i, to: i + 1 })
      } else {
        bracketStack.pop()
      }
      i += 1
      continue
    }
    if (ch === '[') {
      const start = i
      i += 1
      let end = i
      while (end < n && str[end] !== ']' && str[end] !== '\n') end += 1
      if (end >= n || str[end] !== ']') {
        errors.push({ message: 'Не закрыта скобка [', from: start, to: start + 1 })
        i = end >= n ? n : end + 1
        continue
      }
      const name = str.slice(i, end).trim()
      if (name === '') {
        errors.push({ message: 'Пустая ссылка []', from: start, to: end + 1 })
      } else if (!allowedNames.has(name)) {
        errors.push({ message: `Неизвестная ссылка: [${name}]`, from: start, to: end + 1 })
      }
      i = end + 1
      continue
    }
    if (ch === ']') {
      errors.push({ message: 'Лишняя закрывающая скобка ]', from: i, to: i + 1 })
      i += 1
      continue
    }
    i += 1
  }

  while (bracketStack.length > 0) {
    const from = bracketStack.pop()
    errors.push({ message: 'Не закрыта скобка (', from, to: from + 1 })
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
