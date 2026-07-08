/**
 * ЭНДПОИНТЫ API
 *
 * Автоматически загружаются из всех модулей через ModuleManager.
 * Явная инициализация через initEndpoints() в main.js — без top-level await,
 * чтобы не блокировать загрузку роутера в production-сборке.
 */

import { getEndpoints } from '@/modules/index.js'

const hot = import.meta.hot

let endpointsCache = hot?.data?.endpointsCache ?? null
let endpointsPromise = hot?.data?.endpointsPromise ?? null

function restoreEndpointsFromHotData() {
  if (endpointsCache) {
    return true
  }

  const hotCache = hot?.data?.endpointsCache
  if (!hotCache) {
    return false
  }

  endpointsCache = hotCache
  endpointsPromise = hot?.data?.endpointsPromise ?? endpointsPromise
  return true
}

async function loadEndpoints() {
  restoreEndpointsFromHotData()
  if (endpointsCache !== null) {
    return endpointsCache
  }

  if (endpointsPromise !== null) {
    return endpointsPromise
  }

  endpointsPromise = getEndpoints()
    .then((result) => {
      endpointsCache = result
      if (hot) {
        hot.data.endpointsCache = endpointsCache
        hot.data.endpointsPromise = endpointsPromise
      }
      return result
    })
    .catch((err) => {
      endpointsPromise = null
      throw err
    })

  return endpointsPromise
}

/**
 * Загружает объединённые эндпоинты всех модулей (идемпотентно).
 * @returns {Promise<Object>}
 */
export async function initEndpoints() {
  return loadEndpoints()
}

export function isEndpointsReady() {
  restoreEndpointsFromHotData()
  return endpointsCache !== null
}

export const endpoints = new Proxy(
  {},
  {
    get(_, prop) {
      restoreEndpointsFromHotData()
      if (!endpointsCache) {
        throw new Error(
          `Endpoints not initialized (accessed: ${String(prop)}). Call initEndpoints() first.`,
        )
      }
      return endpointsCache[prop]
    },
  },
)

if (hot) {
  hot.dispose((data) => {
    data.endpointsCache = endpointsCache
    data.endpointsPromise = endpointsPromise
  })

  hot.accept(async () => {
    restoreEndpointsFromHotData()
    if (!endpointsCache) {
      await loadEndpoints()
    }
  })
}
