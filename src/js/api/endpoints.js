/**
 * ЭНДПОИНТЫ API
 *
 * Автоматически загружаются из всех модулей через ModuleManager.
 * Явная инициализация через initEndpoints() в main.js — без top-level await,
 * чтобы не блокировать загрузку роутера в production-сборке.
 *
 * Первый вызов (boot) не ждёт federated remotes — сессия идёт сразу.
 * Повторный вызов и Proxy подтягивают кэш после ensureInitialized,
 * иначе endpoints.<remote> ещё undefined (competenceCore.demandForecast и т.п.).
 */

import { getEndpoints, moduleManager } from '@/modules/index.js'

const hot = import.meta.hot

let endpointsCache = hot?.data?.endpointsCache ?? null
let endpointsPromise = hot?.data?.endpointsPromise ?? null
/** @type {Promise<Object>|null} */
let remotesEndpointsPromise = hot?.data?.remotesEndpointsPromise ?? null

function persistHotEndpoints() {
  if (!hot) {
    return
  }
  hot.data.endpointsCache = endpointsCache
  hot.data.endpointsPromise = endpointsPromise
  hot.data.remotesEndpointsPromise = remotesEndpointsPromise
}

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
  remotesEndpointsPromise = hot?.data?.remotesEndpointsPromise ?? remotesEndpointsPromise
  return true
}

/**
 * Снимок EndpointManager → Proxy. Вызывать после регистрации remotes.
 * @returns {Object|null}
 */
export function syncEndpointsCache() {
  if (!moduleManager.endpointManager?.initialized && !moduleManager.initialized) {
    return endpointsCache
  }
  endpointsCache = moduleManager.endpoints.getAllEndpoints()
  persistHotEndpoints()
  return endpointsCache
}

function scheduleRemotesEndpointsRefresh() {
  if (remotesEndpointsPromise) {
    return remotesEndpointsPromise
  }
  remotesEndpointsPromise = moduleManager
    .ensureInitialized()
    .then(() => syncEndpointsCache())
    .catch((err) => {
      remotesEndpointsPromise = null
      throw err
    })
  persistHotEndpoints()
  return remotesEndpointsPromise
}

async function loadEndpoints() {
  restoreEndpointsFromHotData()

  if (endpointsCache !== null) {
    if (moduleManager.initialized) {
      return syncEndpointsCache()
    }
    return scheduleRemotesEndpointsRefresh()
  }

  if (endpointsPromise !== null) {
    await endpointsPromise
    if (moduleManager.initialized) {
      return syncEndpointsCache()
    }
    return scheduleRemotesEndpointsRefresh()
  }

  endpointsPromise = getEndpoints()
    .then((result) => {
      endpointsCache = result
      persistHotEndpoints()
      // Boot не ждёт remotes; фоном обновим кэш, когда манифесты remote зарегистрируются.
      void scheduleRemotesEndpointsRefresh().catch(() => {})
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
 * Повторные вызовы дожидаются federated remotes и обновляют кэш.
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
      if (
        (endpointsCache[prop] === undefined || !(prop in endpointsCache))
        && (moduleManager.initialized || moduleManager.endpointManager?.initialized)
      ) {
        syncEndpointsCache()
      }
      return endpointsCache[prop]
    },
  },
)

if (hot) {
  hot.dispose((data) => {
    data.endpointsCache = endpointsCache
    data.endpointsPromise = endpointsPromise
    data.remotesEndpointsPromise = remotesEndpointsPromise
  })

  hot.accept(async () => {
    restoreEndpointsFromHotData()
    if (!endpointsCache) {
      await loadEndpoints()
    }
  })
}
