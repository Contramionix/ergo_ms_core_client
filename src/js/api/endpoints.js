/**
 * ЭНДПОИНТЫ API
 *
 * Автоматически загружаются из всех модулей через ModuleManager.
 * Явная инициализация через initEndpoints() в main.js — без top-level await,
 * чтобы не блокировать загрузку роутера в production-сборке.
 */

import { getEndpoints } from '@/modules/index.js'

let endpointsCache = null
let endpointsPromise = null

async function loadEndpoints() {
  if (endpointsCache !== null) {
    return endpointsCache
  }

  if (endpointsPromise !== null) {
    return endpointsPromise
  }

  endpointsPromise = getEndpoints()
    .then((result) => {
      endpointsCache = result
      return result
    })
    .catch((err) => {
      endpointsPromise = null
      throw err
    })

  return endpointsPromise
}

/**
 * Загружает объединённые эндпоинты всех модулей (один раз).
 * @returns {Promise<Object>}
 */
export async function initEndpoints() {
  return loadEndpoints()
}

export const endpoints = new Proxy(
  {},
  {
    get(_, prop) {
      if (!endpointsCache) {
        throw new Error(
          `Endpoints not initialized (accessed: ${String(prop)}). Call initEndpoints() first.`,
        )
      }
      return endpointsCache[prop]
    },
  },
)
