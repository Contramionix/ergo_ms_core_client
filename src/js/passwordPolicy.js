function parseBool(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }
  return String(value).toLowerCase() === 'true'
}

function parseIntOr(value, defaultValue) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

export const passwordPolicy = {
  minLength: parseIntOr(import.meta.env.VITE_PASSWORD_MIN_LENGTH, 8),
  maxLength: parseIntOr(import.meta.env.VITE_PASSWORD_MAX_LENGTH, 128),
  requireLowercase: parseBool(import.meta.env.VITE_PASSWORD_REQUIRE_LOWERCASE, true),
  requireUppercase: parseBool(import.meta.env.VITE_PASSWORD_REQUIRE_UPPERCASE, false),
  requireDigit: parseBool(import.meta.env.VITE_PASSWORD_REQUIRE_DIGIT, true),
  requireSpecial: parseBool(import.meta.env.VITE_PASSWORD_REQUIRE_SPECIAL, false),
}

export function getPasswordRequirementHints() {
  const hints = [`Минимум ${passwordPolicy.minLength} символов`]

  if (passwordPolicy.maxLength > 0) {
    hints.push(`Не более ${passwordPolicy.maxLength} символов`)
  }
  if (passwordPolicy.requireLowercase) {
    hints.push('Хотя бы одна строчная буква')
  }
  if (passwordPolicy.requireUppercase) {
    hints.push('Хотя бы одна заглавная буква')
  }
  if (passwordPolicy.requireDigit) {
    hints.push('Хотя бы одна цифра')
  }
  if (passwordPolicy.requireSpecial) {
    hints.push('Хотя бы один специальный символ')
  }

  return hints
}

export function validatePasswordValue(password) {
  if (!password) {
    return null
  }

  if (password.length < passwordPolicy.minLength) {
    return `Пароль должен содержать минимум ${passwordPolicy.minLength} символов.`
  }

  if (passwordPolicy.maxLength > 0 && password.length > passwordPolicy.maxLength) {
    return `Пароль должен содержать не более ${passwordPolicy.maxLength} символов.`
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну букву в нижнем регистре.'
  }

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну букву в верхнем регистре.'
  }

  if (passwordPolicy.requireDigit && !/[0-9]/.test(password)) {
    return 'Пароль должен содержать хотя бы одну цифру.'
  }

  if (passwordPolicy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return 'Пароль должен содержать хотя бы один специальный символ.'
  }

  return null
}
