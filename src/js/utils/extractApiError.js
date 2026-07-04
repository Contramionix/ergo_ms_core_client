/**
 * Извлекает текст ошибки из ответа API для отображения в UI.
 */
export function extractApiError(error, fallback = 'Произошла ошибка. Попробуйте позже.') {
  const data = error?.response?.data
  if (!data) {
    return fallback
  }
  if (typeof data === 'string') {
    return data
  }
  if (typeof data.error === 'string') {
    return data.error
  }
  if (typeof data.detail === 'string') {
    return data.detail
  }
  if (Array.isArray(data.non_field_errors) && data.non_field_errors.length) {
    return String(data.non_field_errors[0])
  }
  const firstKey = Object.keys(data)[0]
  if (firstKey) {
    const value = data[firstKey]
    if (Array.isArray(value) && value.length) {
      return String(value[0])
    }
    if (typeof value === 'string') {
      return value
    }
  }
  return fallback
}
