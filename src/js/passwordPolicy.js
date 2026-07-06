import { clientEnv } from '@/js/clientEnv.js'

export const passwordPolicy = {
  minLength: clientEnv.passwordMinLength,
  maxLength: clientEnv.passwordMaxLength,
  requireLowercase: clientEnv.passwordRequireLowercase,
  requireUppercase: clientEnv.passwordRequireUppercase,
  requireDigit: clientEnv.passwordRequireDigit,
  requireSpecial: clientEnv.passwordRequireSpecial,
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
