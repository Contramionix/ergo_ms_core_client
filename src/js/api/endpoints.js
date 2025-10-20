/**
 * ЭНДПОИНТЫ API
 * 
 * Автоматически загружаются из всех модулей через ModuleManager
 */

import { getEndpoints } from '@/modules/index.js'

// Получаем эндпоинты через модульную систему
const allEndpoints = await getEndpoints()

// Экспортируем объединенные эндпоинты
export const endpoints = allEndpoints
