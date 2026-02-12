// Вспомогательные функции для работы с датами в BI-фильтрах

function pad2(num) {
  return num < 10 ? `0${num}` : String(num)
}

export function getToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function truncateToStartOfDay(date) {
  if (!date) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function endOfDay(date) {
  if (!date) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
}

export function applyOffset(baseDate, { sign = 'minus', amount = 0, unit = 'days' } = {}) {
  if (!baseDate || !Number.isFinite(Number(amount))) return baseDate
  const factor = sign === 'plus' ? 1 : -1
  const count = Number(amount) * factor
  const d = new Date(baseDate.getTime())

  switch (unit) {
    case 'years':
      d.setFullYear(d.getFullYear() + count)
      break
    case 'quarters':
      d.setMonth(d.getMonth() + count * 3)
      break
    case 'months':
      d.setMonth(d.getMonth() + count)
      break
    case 'weeks':
      d.setDate(d.getDate() + count * 7)
      break
    case 'days':
    default:
      d.setDate(d.getDate() + count)
      break
  }

  return d
}

export function formatDateForField(date, fieldType) {
  if (!date) return null
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const mm = pad2(date.getMinutes())
  const ss = pad2(date.getSeconds())

  if (fieldType === 'date') {
    return `${y}-${m}-${d}`
  }
  if (fieldType === 'date&time') {
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
  }
  return date.toISOString()
}

export function formatDateForInput(date, fieldType, isEnd = false) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())

  if (fieldType === 'date') {
    return `${y}-${m}-${d}`
  }

  // datetime-local
  if (fieldType === 'date&time') {
    // Для конца диапазона по умолчанию ставим конец дня
    const hours = isEnd ? 23 : date.getHours()
    const minutes = isEnd ? 59 : date.getMinutes()
    return `${y}-${m}-${d}T${pad2(hours)}:${pad2(minutes)}`
  }

  return `${y}-${m}-${d}`
}

export function parseInputDate(value, fieldType, isEnd = false) {
  if (!value) return null
  try {
    if (fieldType === 'date') {
      const [y, m, d] = value.split('-').map((v) => Number(v))
      if (!y || !m || !d) return null
      const base = new Date(y, m - 1, d)
      return isEnd ? endOfDay(base) : truncateToStartOfDay(base)
    }
    if (fieldType === 'date&time') {
      // datetime-local формат: YYYY-MM-DDTHH:mm
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return null
      return date
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

export function formatDisplayDate(date, fieldType) {
  if (!date) return ''
  const dd = pad2(date.getDate())
  const mm = pad2(date.getMonth() + 1)
  const yyyy = date.getFullYear()
  const hh = pad2(date.getHours())
  const min = pad2(date.getMinutes())
  const ss = pad2(date.getSeconds())

  if (fieldType === 'date') {
    return `${dd}.${mm}.${yyyy}`
  }
  if (fieldType === 'date&time') {
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`
  }
  return `${dd}.${mm}.${yyyy}`
}

export function buildRangeFromPreset(presetKey, includeToday) {
  if (!presetKey) return { start: null, end: null }
  const today = getToday()
  const endBase = includeToday ? today : applyOffset(today, { sign: 'minus', amount: 1, unit: 'days' })
  let start = null
  let end = null

  switch (presetKey) {
    case 'today':
      start = truncateToStartOfDay(today)
      end = endOfDay(today)
      break
    case 'yesterday': {
      const yDay = applyOffset(today, { sign: 'minus', amount: 1, unit: 'days' })
      start = truncateToStartOfDay(yDay)
      end = endOfDay(yDay)
      break
    }
    case 'last_3_days':
      start = applyOffset(endBase, { sign: 'minus', amount: 2, unit: 'days' })
      end = endBase
      break
    case 'last_7_days':
      start = applyOffset(endBase, { sign: 'minus', amount: 6, unit: 'days' })
      end = endBase
      break
    case 'last_14_days':
      start = applyOffset(endBase, { sign: 'minus', amount: 13, unit: 'days' })
      end = endBase
      break
    case 'last_28_days':
      start = applyOffset(endBase, { sign: 'minus', amount: 27, unit: 'days' })
      end = endBase
      break
    case 'last_90_days':
      start = applyOffset(endBase, { sign: 'minus', amount: 89, unit: 'days' })
      end = endBase
      break
    case 'last_180_days':
      start = applyOffset(endBase, { sign: 'minus', amount: 179, unit: 'days' })
      end = endBase
      break
    case 'last_365_days':
      start = applyOffset(endBase, { sign: 'minus', amount: 364, unit: 'days' })
      end = endBase
      break
    default:
      break
  }

  if (start) start = truncateToStartOfDay(start)
  if (end) end = endOfDay(end)

  return { start, end }
}

export function expandDateRangeFilter(fieldEntry) {
  const filter = fieldEntry?.filter || {}
  const value = filter.value || {}
  const start = value.start
  const end = value.end
  const result = []

  if (start) {
    result.push({
      ...fieldEntry,
      filter: { op: 'gte', value: start }
    })
  }

  if (end) {
    result.push({
      ...fieldEntry,
      filter: { op: 'lte', value: end }
    })
  }

  return result
}

