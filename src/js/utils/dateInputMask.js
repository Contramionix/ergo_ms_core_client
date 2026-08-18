export const DATE_MASK_MAX_LENGTH = 10
export const DATETIME_MASK_MAX_LENGTH = 16

function maxDigits(withTime) {
    return withTime ? 12 : 8
}

function maxLength(withTime) {
    return withTime ? DATETIME_MASK_MAX_LENGTH : DATE_MASK_MAX_LENGTH
}

export function extractDateDigits(value, withTime = false) {
    return String(value ?? '').replace(/\D/g, '').slice(0, maxDigits(withTime))
}

export function formatDateDigits(digits, withTime = false) {
    const day = digits.slice(0, 2)
    const month = digits.slice(2, 4)
    const year = digits.slice(4, 8)

    let formatted = day
    if (digits.length > 2) {
        formatted += `.${month}`
    }
    if (digits.length > 4) {
        formatted += `.${year}`
    }
    if (withTime && digits.length > 8) {
        formatted += ` ${digits.slice(8, 10)}`
    }
    if (withTime && digits.length > 10) {
        formatted += `:${digits.slice(10, 12)}`
    }
    return formatted
}

export function getDigitIndexFromCaret(caret, value, withTime = false) {
    return extractDateDigits(String(value ?? '').slice(0, caret), withTime).length
}

export function getCaretForDigitIndex(digitIndex, withTime = false) {
    if (digitIndex <= 0) return 0
    if (digitIndex <= 2) return digitIndex === 2 ? 3 : digitIndex
    if (digitIndex <= 4) return digitIndex === 4 ? 6 : digitIndex + 1
    if (digitIndex <= 8) {
        if (digitIndex === 8) return withTime ? 11 : DATE_MASK_MAX_LENGTH
        return digitIndex + 2
    }
    if (!withTime) return DATE_MASK_MAX_LENGTH
    if (digitIndex <= 10) return digitIndex === 10 ? 14 : digitIndex + 3
    return Math.min(digitIndex + 4, DATETIME_MASK_MAX_LENGTH)
}

export function applyDigitToDateInput(input, digit, withTime = false) {
    const caret = input.selectionStart ?? input.value.length
    const selectionEnd = input.selectionEnd ?? caret
    const digits = extractDateDigits(input.value, withTime)

    const digitIndexStart = getDigitIndexFromCaret(caret, input.value, withTime)
    const digitIndexEnd = getDigitIndexFromCaret(selectionEnd, input.value, withTime)

    const nextDigits = `${digits.slice(0, digitIndexStart)}${digit}${digits.slice(digitIndexEnd)}`.slice(
        0,
        maxDigits(withTime),
    )
    const formatted = formatDateDigits(nextDigits, withTime)
    const nextCaret = getCaretForDigitIndex(Math.min(digitIndexStart + 1, nextDigits.length), withTime)

    input.value = formatted
    input.setSelectionRange(nextCaret, nextCaret)
    input.dispatchEvent(new Event('input', { bubbles: true }))
}

export function applyPastedDigitsToDateInput(input, pastedText, withTime = false) {
    const caret = input.selectionStart ?? input.value.length
    const selectionEnd = input.selectionEnd ?? caret
    const digits = extractDateDigits(input.value, withTime)
    const pastedDigits = extractDateDigits(pastedText, withTime)

    const digitIndexStart = getDigitIndexFromCaret(caret, input.value, withTime)
    const digitIndexEnd = getDigitIndexFromCaret(selectionEnd, input.value, withTime)

    const nextDigits = `${digits.slice(0, digitIndexStart)}${pastedDigits}${digits.slice(digitIndexEnd)}`.slice(
        0,
        maxDigits(withTime),
    )
    const formatted = formatDateDigits(nextDigits, withTime)
    const nextCaret = getCaretForDigitIndex(
        Math.min(digitIndexStart + pastedDigits.length, nextDigits.length),
        withTime,
    )

    input.value = formatted
    input.setSelectionRange(nextCaret, nextCaret)
    input.dispatchEvent(new Event('input', { bubbles: true }))
}

export function advanceCaretToNextDateSection(input, withTime = false) {
    const caret = input.selectionStart ?? 0
    const digits = extractDateDigits(input.value, withTime)

    if (caret <= 2 && digits.length >= 2) {
        input.setSelectionRange(3, 3)
        return
    }
    if (caret <= 5 && digits.length >= 4) {
        input.setSelectionRange(6, 6)
        return
    }
    if (withTime && caret <= 10 && digits.length >= 8) {
        input.setSelectionRange(11, 11)
        return
    }
    if (withTime && caret <= 13 && digits.length >= 10) {
        input.setSelectionRange(14, 14)
        return
    }
    const end = maxLength(withTime)
    input.setSelectionRange(end, end)
}

export function normalizeDateInputMask(input, withTime = false) {
    const caret = input.selectionStart ?? input.value.length
    const digitsBefore = getDigitIndexFromCaret(caret, input.value, withTime)
    const digits = extractDateDigits(input.value, withTime)
    const formatted = formatDateDigits(digits, withTime)

    if (input.value === formatted) return false

    input.value = formatted
    const nextCaret = getCaretForDigitIndex(digitsBefore, withTime)
    input.setSelectionRange(nextCaret, nextCaret)
    return true
}