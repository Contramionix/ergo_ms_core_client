import { tGlobal } from '@/i18n/index.js'
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
  const hints = [tGlobal('auth.passwordPolicy.hintMin', { count: passwordPolicy.minLength })]

  if (passwordPolicy.maxLength > 0) {
    hints.push(tGlobal('auth.passwordPolicy.hintMax', { count: passwordPolicy.maxLength }))
  }
  if (passwordPolicy.requireLowercase) {
    hints.push(tGlobal('auth.passwordPolicy.hintLower'))
  }
  if (passwordPolicy.requireUppercase) {
    hints.push(tGlobal('auth.passwordPolicy.hintUpper'))
  }
  if (passwordPolicy.requireDigit) {
    hints.push(tGlobal('auth.passwordPolicy.hintDigit'))
  }
  if (passwordPolicy.requireSpecial) {
    hints.push(tGlobal('auth.passwordPolicy.hintSpecial'))
  }

  return hints
}

export function validatePasswordValue(password) {
  if (!password) {
    return null
  }

  if (password.length < passwordPolicy.minLength) {
    return tGlobal('auth.passwordPolicy.minLength', { count: passwordPolicy.minLength })
  }

  if (passwordPolicy.maxLength > 0 && password.length > passwordPolicy.maxLength) {
    return tGlobal('auth.passwordPolicy.maxLength', { count: passwordPolicy.maxLength })
  }

  if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
    return tGlobal('auth.passwordPolicy.requireLower')
  }

  if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
    return tGlobal('auth.passwordPolicy.requireUpper')
  }

  if (passwordPolicy.requireDigit && !/[0-9]/.test(password)) {
    return tGlobal('auth.passwordPolicy.requireDigit')
  }

  if (passwordPolicy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    return tGlobal('auth.passwordPolicy.requireSpecial')
  }

  return null
}
