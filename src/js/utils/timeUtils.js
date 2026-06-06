/**
 * Утилиты для работы с временем
 */

/**
 * Возвращает русское название месяца по номеру (1–12).
 * По умолчанию — "все месяцы" для нулевого или некорректного значения.
 * @param {number} month
 * @returns {string}
 */
export function getMonthNameByNumber(month) {
    const months = {
        1: 'январь',
        2: 'февраль',
        3: 'март',
        4: 'апрель',
        5: 'май',
        6: 'июнь',
        7: 'июль',
        8: 'август',
        9: 'сентябрь',
        10: 'октябрь',
        11: 'ноябрь',
        12: 'декабрь',
    }

    if (!month || month < 1 || month > 12) {
        return 'все месяцы'
    }

    return months[month] || 'все месяцы'
}

/**
 * Парсит дату и возвращает валидный объект Date или null
 * @param {string|Date} date - Дата в ISO формате или объект Date
 * @returns {Date|null} Валидный объект Date или null
 */
function parseDate(date) {
    if (!date) return null
    const d = new Date(date)
    return isNaN(d.getTime()) ? null : d
}

/**
 * Склоняет русские слова в зависимости от числа
 * @param {number} count - Число
 * @param {string} one - Форма для 1 (например, "минуту")
 * @param {string} few - Форма для 2-4 (например, "минуты")
 * @param {string} many - Форма для 5+ (например, "минут")
 * @returns {string} Правильная форма слова
 */
function pluralizeRu(count, one, few, many) {
    if (count === 1) return one
    const mod10 = count % 10
    const mod100 = count % 100
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
    return many
}

/**
 * Форматирует дату в относительное время (например, "несколько минут назад", "1 час назад")
 * @param {string|Date} date - Дата в ISO формате или объект Date
 * @returns {string} Относительное время на русском языке
 */
export function getRelativeTime(date) {
    const targetDate = parseDate(date)
    if (!targetDate) return ''
    
    const now = new Date()
    const diffInSeconds = Math.floor((now - targetDate) / 1000)
    
    if (diffInSeconds < 0) return 'в будущем'
    if (diffInSeconds < 60) return 'только что'
    
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
        return `${diffInMinutes} ${pluralizeRu(diffInMinutes, 'минуту', 'минуты', 'минут')} назад`
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
        return `${diffInHours} ${pluralizeRu(diffInHours, 'час', 'часа', 'часов')} назад`
    }
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
        return `${diffInDays} ${pluralizeRu(diffInDays, 'день', 'дня', 'дней')} назад`
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7)
    const diffInMonths = Math.floor(diffInDays / 30)
    
    // Если меньше 4 недель, показываем недели
    if (diffInWeeks < 4) {
        return `${diffInWeeks} ${pluralizeRu(diffInWeeks, 'неделю', 'недели', 'недель')} назад`
    }
    
    // Если месяцев 0, но больше или равно 4 неделям, показываем недели
    if (diffInMonths === 0) {
        return `${diffInWeeks} ${pluralizeRu(diffInWeeks, 'неделю', 'недели', 'недель')} назад`
    }
    
    // Если месяцев больше 0, но меньше 12, показываем месяцы
    if (diffInMonths < 12) {
        return `${diffInMonths} ${pluralizeRu(diffInMonths, 'месяц', 'месяца', 'месяцев')} назад`
    }
    
    const diffInYears = Math.floor(diffInDays / 365)
    return `${diffInYears} ${pluralizeRu(diffInYears, 'год', 'года', 'лет')} назад`
}

/**
 * Форматирует дату с временем в формат "dd.mm.yyyy, hh:mm" (например, "01.01.2024, 14:30")
 * @param {string|Date} date - Дата в ISO формате или объект Date
 * @returns {string} Отформатированная дата с временем или "—" при ошибке
 */
export function formatDateTime(date) {
    if (!date) return '—'
    const targetDate = parseDate(date)
    if (!targetDate) return '—'
    
    try {
        return new Intl.DateTimeFormat('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(targetDate)
    } catch {
        return '—'
    }
}

/**
 * Форматирует дату в полный формат с относительным временем
 * @param {string|Date} date - Дата в ISO формате или объект Date
 * @returns {string} Полный формат даты с относительным временем
 */
export function getFormattedDateWithRelative(date) {
    const targetDate = parseDate(date)
    if (!targetDate) return ''
    
    const relativeTime = getRelativeTime(date)
    const fullDate = formatDateTime(date)
    
    return `${relativeTime} (${fullDate})`
}

/**
 * Форматирует дату в полный формат с днём недели и секундами
 * @param {string|Date} date - Дата в ISO формате или объект Date
 * @returns {string} Полный формат даты с днём недели, датой, временем и секундами
 */
export function getFullDateTime(date) {
    const targetDate = parseDate(date)
    if (!targetDate) return ''
    
    return new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'long'
    }).format(targetDate)
}

/**
 * Форматирует дату в формат "dd месяц yyyy" (например, "01 января 2024")
 * @param {string|Date} date - Дата в ISO формате или объект Date
 * @returns {string} Отформатированная дата или исходная строка при ошибке
 */
export function formatDate(date) {
    if (!date) return ''
    const d = parseDate(date)
    if (!d) return String(date)
    
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ]
    const dd = String(d.getDate()).padStart(2, '0')
    const monthName = months[d.getMonth()]
    const yyyy = d.getFullYear()
    return `${dd} ${monthName} ${yyyy}`
}

/**
 * Форматирует дату в короткий формат "dd.mm.yyyy" (например, "01.01.2024")
 * @param {string|Date} date - Дата в ISO формате или объект Date
 * @returns {string} Отформатированная дата в формате dd.mm.yyyy
 */
export function formatDateShort(date) {
    const d = parseDate(date)
    if (!d) return ''
    
    return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

/**
 * Форматирует дату в формат YYYY-MM-DD для API (локальный часовой пояс)
 * @param {string|Date} date - Дата в ISO формате или объект Date
 * @returns {string} Отформатированная дата в формате YYYY-MM-DD
 */
export function formatDateLocal(date) {
    const d = parseDate(date)
    if (!d) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Вспомогательная функция для форматирования диапазона дат
 * @param {string|Date} startDate - Дата начала
 * @param {string|Date} endDate - Дата окончания
 * @param {Function} formatter - Функция форматирования одной даты
 * @returns {string} Отформатированный диапазон дат
 */
function formatDateRangeHelper(startDate, endDate, formatter) {
    if (!startDate || !endDate) return ''
    const start = parseDate(startDate)
    const end = parseDate(endDate)
    if (!start || !end) return ''
    
    return `${formatter(startDate)} — ${formatter(endDate)}`
}

/**
 * Форматирует диапазон дат в формат "дд месяц год — дд месяц год" (например, "01 января 2024 — 31 января 2024")
 * @param {string|Date} startDate - Дата начала в ISO формате или объект Date
 * @param {string|Date} endDate - Дата окончания в ISO формате или объект Date
 * @returns {string} Отформатированный диапазон дат
 */
export function formatDateRange(startDate, endDate) {
    return formatDateRangeHelper(startDate, endDate, formatDate)
}

/**
 * Форматирует диапазон дат в короткий формат "dd.mm.yyyy — dd.mm.yyyy" (например, "01.01.2024 — 31.01.2024")
 * @param {string|Date} startDate - Дата начала в ISO формате или объект Date
 * @param {string|Date} endDate - Дата окончания в ISO формате или объект Date
 * @returns {string} Отформатированный диапазон дат в коротком формате
 */
export function formatDateRangeShort(startDate, endDate) {
    return formatDateRangeHelper(startDate, endDate, formatDateShort)
}

/**
 * Форматирует диапазон дат в формат месяца/месяцев (например, "январь 2024" или "январь 2024 — февраль 2024")
 * @param {string|Date} startDate - Дата начала в ISO формате или объект Date
 * @param {string|Date} endDate - Дата окончания в ISO формате или объект Date
 * @returns {string} Отформатированный диапазон месяцев
 */
export function formatMonthRange(startDate, endDate) {
    if (!startDate || !endDate) return ''
    const start = parseDate(startDate)
    const end = parseDate(endDate)
    if (!start || !end) return ''
    
    const startMonth = start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    const endMonth = end.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    
    return startMonth === endMonth ? startMonth : `${startMonth} — ${endMonth}`
}

/**
 * Форматирует ключ периода YYYY-MM для отображения (например, «Март 2026»)
 * @param {string} monthKey - Строка вида YYYY-MM
 * @returns {string} Подпись месяца и года или «—»
 */
export function formatYearMonthKeyRu(monthKey) {
    if (!monthKey || typeof monthKey !== 'string' || !/^\d{4}-\d{2}$/.test(monthKey)) return '—'
    const [yearStr, monthStr] = monthKey.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return '—'

    const date = new Date(year, month - 1, 1)
    const label = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
}

/**
 * Нормализует значение к строке YYYY-MM-DD (ISO date).
 * Поддерживает: string (ISO/parseable), Date, объект {day, month, year}
 * @param {string|Date|Object} value - Дата в любом поддерживаемом формате
 * @returns {string} Дата в формате YYYY-MM-DD или пустая строка
 */
export function toISODate(value) {
    if (!value) return ''
    if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
        const parsed = parseDate(value)
        return parsed ? formatDateLocal(parsed) : ''
    }
    if (value instanceof Date && !isNaN(value)) return formatDateLocal(value)
    if (typeof value === 'object' && value.day != null && value.month != null && value.year != null) {
        return convertDateObjectToString(value)
    }
    return ''
}

/**
 * Конвертирует старый формат даты (объект с day, month, year) в строку YYYY-MM-DD
 * @param {Object} dateObj - Объект с полями {day, month, year}
 * @returns {string} Дата в формате YYYY-MM-DD или пустая строка
 */
function convertDateObjectToString(dateObj) {
    if (!dateObj || typeof dateObj !== 'object') return ''
    const { day, month, year } = dateObj
    if (!day || !month || !year) return ''
    const date = new Date(year, month - 1, day)
    return formatDateLocal(date)
}

/**
 * Получает дату по умолчанию (1 число следующего месяца)
 * @returns {string} Дата в формате YYYY-MM-DD
 */
export function getDefaultStartDate() {
    const today = new Date()
    const nextMonth = today.getMonth() + 1
    const nextYear = nextMonth > 11 ? today.getFullYear() + 1 : today.getFullYear()
    const actualNextMonth = nextMonth > 11 ? 0 : nextMonth
    
    const firstDayOfNextMonth = new Date(nextYear, actualNextMonth, 1)
    return formatDateLocal(firstDayOfNextMonth)
}

/**
 * Получает дату окончания по умолчанию (31 декабря года даты начала или текущего года)
 * @param {string|Date} startDate - Дата начала (опционально)
 * @returns {string} Дата в формате YYYY-MM-DD
 */
export function getDefaultEndDate(startDate = null) {
    let targetYear
    
    if (startDate) {
        const startDateObj = parseDate(startDate)
        targetYear = startDateObj ? startDateObj.getFullYear() : new Date().getFullYear()
    } else {
        targetYear = new Date().getFullYear()
    }
    
    const endOfYear = new Date(targetYear, 11, 31) // 11 = декабрь (0-индексированный)
    return formatDateLocal(endOfYear)
}