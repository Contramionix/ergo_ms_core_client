import ruTime from '../../i18n/locales/ru/time.js'
import enTime from '../../i18n/locales/en/time.js'
import frTime from '../../i18n/locales/fr/time.js'

const MONTH_CATALOGS = [ruTime, enTime, frTime]
const MONTH_NAME_KEYS = ['months', 'monthsGenitive']

const MONTH_NAMES = buildMonthNames()

function normalizeText(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/ё/g, 'е')
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/g, ' ')
}

function buildMonthNames() {
    const byMonth = new Map()
    for (const catalog of MONTH_CATALOGS) {
        for (const key of MONTH_NAME_KEYS) {
            const dict = catalog[key] || {}
            for (let month = 1; month <= 12; month += 1) {
                const name = normalizeText(dict[month])
                if (!name) continue
                const names = byMonth.get(month) || []
                if (!names.includes(name)) names.push(name)
                byMonth.set(month, names)
            }
        }
    }
    return byMonth
}

function matchMonth(token) {
    const word = token.replace(/\./g, '')
    if (!/^[\p{L}]+$/u.test(word) || word.length < 3) return null
    const hits = new Set()
    for (const [month, names] of MONTH_NAMES) {
        if (names.some((name) => name.startsWith(word))) hits.add(month)
    }
    if (hits.size !== 1) return null
    return [...hits][0]
}

function expandYear(value, digits) {
    if (digits === 4) return value
    if (digits !== 2) return null
    return value <= 69 ? 2000 + value : 1900 + value
}

function isCalendarDate(year, month, day) {
    if (day < 1 || day > 31 || month < 1 || month > 12) return false
    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
}

function takeTime(text) {
    const matches = [...text.matchAll(/(?:^|\s)(\d{1,2}):(\d{2})(?!\d)/g)]
    if (matches.length === 0) return { text, hours: null, minutes: null }
    if (matches.length > 1) return { invalid: true }
    const hours = Number(matches[0][1])
    const minutes = Number(matches[0][2])
    if (hours > 23 || minutes > 59) return { invalid: true }
    return {
        text: text.replace(matches[0][0], ' '),
        hours,
        minutes,
    }
}

function stripYearSuffix(text) {
    return text.replace(/(?<=\d)\s*года\.?$/u, '').replace(/(?<=\d)\s*г\.?$/u, '')
}

function parseNamedDateTokens(tokens) {
    let month = null
    let monthIndex = -1
    let unknown = false
    const numbers = []

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index].replace(/^\.+|\.+$/g, '')
        if (!token) continue

        const monthHit = matchMonth(token)
        if (monthHit) {
            if (month != null) return { recognized: true }
            month = monthHit
            monthIndex = index
            continue
        }

        if (/^\d{4}$/.test(token)) {
            numbers.push({ index, value: Number(token), digits: 4 })
            continue
        }

        const dayMatch = token.match(/^(\d{1,2})(?:-?го)?$/)
        if (dayMatch) {
            numbers.push({
                index,
                value: Number(dayMatch[1]),
                digits: dayMatch[1].length,
            })
            continue
        }

        unknown = true
    }

    if (month == null) return null
    if (unknown) return { recognized: true }

    const years = numbers.filter((item) => item.digits === 4)
    const shorts = numbers.filter((item) => item.digits <= 2)
    let day = null
    let year = null

    if (years.length === 1 && shorts.length === 1) {
        day = shorts[0].value
        year = expandYear(years[0].value, 4)
    } else if (years.length === 0 && shorts.length === 2) {
        const before = shorts.filter((item) => item.index < monthIndex)
        const after = shorts.filter((item) => item.index > monthIndex)
        if (before.length === 1 && after.length === 1) {
            day = before[0].value
            year = expandYear(after[0].value, after[0].digits)
        } else if (before.length === 0 && after.length === 2) {
            day = after[0].value
            year = expandYear(after[1].value, after[1].digits)
        }
    }

    if (day == null || year == null || !isCalendarDate(year, month, day)) {
        return { recognized: true }
    }

    return { recognized: true, day, month, year }
}

export function parseNamedDatePaste(text) {
    const normalized = normalizeText(text)
    if (!normalized) return null

    const time = takeTime(normalized)
    if (time.invalid) {
        const leftover = stripYearSuffix(normalized)
        const tokens = leftover.split(/[\s,]+/).filter(Boolean)
        return parseNamedDateTokens(tokens) ? { recognized: true } : null
    }

    const cleaned = stripYearSuffix(time.text).trim()
    const tokens = cleaned.split(/[\s,]+/).filter(Boolean)
    const parsed = parseNamedDateTokens(tokens)
    if (!parsed?.day) return parsed

    return {
        ...parsed,
        hours: time.hours,
        minutes: time.minutes,
    }
}
