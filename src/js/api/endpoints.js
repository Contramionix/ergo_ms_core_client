/**
 * ЭНДПОИНТЫ API
 * 
 * Автоматически загружаются из всех модулей через ModuleManager
 * 
 * ВАЖНО: Используем единую точку инициализации для избежания множественных запросов
 */

import { getEndpoints } from '@/modules/index.js'

// Глобальный кеш для эндпоинтов - загружается один раз
let endpointsCache = null
let endpointsPromise = null

/**
 * Получает эндпоинты с кешированием
 * Гарантирует, что загрузка произойдет только один раз
 * @returns {Promise<Object>}
 */
async function loadEndpoints() {
  // Если уже загружены - возвращаем из кеша
  if (endpointsCache !== null) {
    return endpointsCache
  }
  
  // Если загрузка уже идет - возвращаем существующий промис
  if (endpointsPromise !== null) {
    return endpointsPromise
  }
  
  // Создаем новый промис загрузки (единственный раз)
  endpointsPromise = getEndpoints().then(result => {
    endpointsCache = result
    return result
  }).catch(err => {
    // При ошибке очищаем промис, чтобы можно было повторить
    endpointsPromise = null
    throw err
  })
  
  return endpointsPromise
}

// Загружаем endpoints сразу при импорте модуля
// Все импорты endpoints.js будут ждать один и тот же промис
const allEndpoints = await loadEndpoints()

// Экспортируем объединенные эндпоинты
export const endpoints = allEndpoints
