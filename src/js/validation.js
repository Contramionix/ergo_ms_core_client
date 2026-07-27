import { tGlobal } from '@/i18n/index.js'
import { validatePasswordValue } from '@/js/passwordPolicy.js'

export const validateFieldValue = (value, name) => {
  let error = null

  if (value && value.trim()) {
    error = null
  } else if (value && !value.trim()) {
    error = tGlobal('auth.validation.whitespaceOnly', { name })
  } else {
    error = tGlobal('auth.validation.required', { name })
  }

  return error
}

export const validateFieldsOnEquality = (firstField, secondField, error) => {
  let firstFieldError = null
  let secondFieldError = null

  if (firstField !== secondField) {
    firstFieldError = ' '
    secondFieldError = error
  }

  return {
    firstFieldError,
    secondFieldError,
  }
}

export const validateLoginForm = (login, password) => {
  const loginError = validateFieldValue(login, tGlobal('auth.validation.login'))
  const passwordError = validateFieldValue(password, tGlobal('auth.validation.password'))

  return {
    loginError,
    passwordError,
  }
}

export const validateAuthorizationForm = (login, password, passwordConfirm) => {
  let loginError = validateFieldValue(login, tGlobal('auth.validation.login'))
  let passwordError = validateFieldValue(password, tGlobal('auth.validation.password'))
  let passwordConfirmError = validateFieldValue(
    passwordConfirm,
    tGlobal('auth.validation.passwordConfirm'),
  )

  if (passwordError === null && passwordConfirmError === null) {
    const { firstFieldError, secondFieldError } = validateFieldsOnEquality(
      password,
      passwordConfirm,
      tGlobal('auth.validation.passwordsMismatch'),
    )

    passwordError = firstFieldError
    passwordConfirmError = secondFieldError
  }

  return {
    loginError,
    passwordError,
    passwordConfirmError,
  }
}

export const validateAuthorizationMethod = (apiErrors) => {
  let loginError = null
  let passwordError = null
  let passwordConfirmError = null

  const firstErrorObject = apiErrors
  const entries = Object.entries(firstErrorObject)
  const [key, value] = entries[0]

  switch (key) {
    case 'password_confirm':
      passwordError = ' '
      passwordConfirmError = value
      break
    case 'message':
      loginError = ' '
      passwordError = ' '
      passwordConfirmError = value
      break
    default:
      break
  }

  return {
    loginError,
    passwordError,
    passwordConfirmError,
  }
}

export const validateCheckBoxValue = (value, error) => {
  if (!value) {
    return error
  }
  return null
}

export const Comparison = {
  LESS: 'LESS',
  MORE: 'MORE',
}

export const validateFieldValueOnLength = (value, length, comparison, error) => {
  if (value.length < length && comparison === comparison.LESS) {
    return error
  }
  if (value.length > length && comparison === comparison.MORE) {
    return error
  }

  return null
}

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateFieldWithRegex = (value, regex, error) => {
  if (regex.test(value) === false) {
    return error
  }

  return null
}

/**
 * Валидация формы регистрации.
 */
export const validateRegistrationForm = (name, login, email, password, passwordConfirm) => {
  const errors = {
    name: null,
    login: null,
    email: null,
    password: null,
    passwordConfirm: null,
  }

  errors.name = validateFieldValue(name, tGlobal('auth.validation.userName'))
  errors.login = validateFieldValue(login, tGlobal('auth.validation.login'))
  errors.email = validateFieldValue(email, tGlobal('auth.validation.email'))
  errors.password = validateFieldValue(password, tGlobal('auth.validation.password'))
  errors.passwordConfirm = validateFieldValue(
    passwordConfirm,
    tGlobal('auth.validation.passwordConfirm'),
  )

  if (errors.email === null) {
    errors.email = validateFieldWithRegex(
      email,
      emailRegex,
      tGlobal('auth.validation.invalidEmail'),
    )
  }

  if (errors.password === null) {
    errors.password = validatePasswordValue(password)
  }

  if (errors.passwordConfirm === null) {
    errors.passwordConfirm = validatePasswordValue(passwordConfirm)
  }

  if (errors.password === null && errors.passwordConfirm === null) {
    const { firstFieldError, secondFieldError } = validateFieldsOnEquality(
      password,
      passwordConfirm,
      tGlobal('auth.validation.passwordsMismatch'),
    )

    errors.password = firstFieldError
    errors.passwordConfirm = secondFieldError
  }

  return errors
}

export const validateRegistrationMethod = (apiErrors) => {
  const errors = {
    name: null,
    login: null,
    email: null,
    password: null,
    passwordConfirm: null,
  }

  const firstErrorObject = apiErrors
  const entries = Object.entries(firstErrorObject)
  const [key, value] = entries[0]

  switch (key) {
    case 'message':
      errors.name = ' '
      errors.login = ' '
      errors.email = ' '
      errors.password = ' '
      errors.passwordConfirm = value
      break
    case 'username':
      errors.login = value
      break
    case 'email':
      errors.email = value
      break
    default:
      break
  }

  return errors
}
