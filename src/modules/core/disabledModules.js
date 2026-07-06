/**
 * Реестр отключённых модулей (client-side).
 *
 * Загружает список из API при первом обращении и кэширует.
 * До загрузки с сервера использует DISABLED_MODULES из .env.
 */

import { clientEnv } from '@/js/clientEnv.js'

let disabledSet = null
let fetchPromise = null

function parseFromEnv() {
  const raw = clientEnv.disabledModules
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean))
}

/**
 * Возвращает Set отключённых модулей (синхронно).
 * Если API ещё не ответил — используется DISABLED_MODULES из .env.
 */
export function getDisabledModulesSync() {
  if (disabledSet !== null) return disabledSet
  return parseFromEnv()
}

/**
 * Загружает disabled-modules с API и кэширует.
 * Безопасно вызывать несколько раз — запрос выполняется только один раз.
 */
export async function fetchDisabledModules(apiClient) {
  if (disabledSet !== null) return disabledSet
  if (fetchPromise) return fetchPromise

  fetchPromise = (async () => {
    try {
      const response = await apiClient.get('cms/disabled-modules/')
      const list = response?.data?.disabled_modules || []
      disabledSet = new Set(list)
    } catch {
      disabledSet = parseFromEnv()
    }
    return disabledSet
  })()

  return fetchPromise
}

/**
 * @param {string} moduleName
 * @returns {boolean}
 */
export function isModuleDisabled(moduleName) {
  return getDisabledModulesSync().has(moduleName)
}

/**
 * Сбрасывает кэш (для hot-reload / тестов).
 */
export function resetDisabledModulesCache() {
  disabledSet = null
  fetchPromise = null
}
