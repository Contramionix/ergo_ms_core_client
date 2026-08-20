/**
 * ГЛАВНАЯ ТОЧКА ВХОДА ДЛЯ МОДУЛЬНОЙ СИСТЕМЫ
 *
 * Экспортирует инициализированные инстансы всех менеджеров
 * и предоставляет API для работы с модулями системы
 */

import { ModuleManager } from './ModuleManager.js'
import { CoreRoutesManager } from './routes/CoreRoutesManager.js'
import { authRoutes, coreRoutes } from '@/config/routes.js'
import { resolveRouteTitle } from '@/i18n/resolveRouteTitle.js'

export const moduleManager = new ModuleManager()
export const coreRoutesManager = new CoreRoutesManager({
  coreRoutes,
  authRoutes,
})

/**
 * Генерирует все роуты для Vue Router
 * @returns {Promise<Array>}
 */
export async function generateAllRoutes() {
  const baseRoutes = coreRoutesManager.getAllCoreRoutes()
  return await moduleManager.generateAllRoutes(baseRoutes)
}

/**
 * Получает все эндпоинты
 * @returns {Promise<Object>}
 */
export async function getEndpoints() {
  return await moduleManager.getEndpoints()
}

/**
 * Получает все правила проверки прав для маршрутов
 * @returns {Promise<Array>}
 */
export async function getPermissionRules() {
  return await moduleManager.getPermissionRules()
}

/**
 * Получает все route guards для Vue Router beforeEach
 * @returns {Promise<Function[]>}
 */
export async function getRouteGuards() {
  return await moduleManager.getRouteGuards()
}

/**
 * Получает все секции прав модулей
 * @returns {Promise<Array>}
 */
export async function getPermissionSections() {
  return await moduleManager.getPermissionSections()
}

/**
 * Формирует начальное состояние прав из всех секций
 * @param {Array} [sections]
 * @returns {Promise<Object>}
 */
export async function buildInitialPermissionState(sections) {
  return await moduleManager.buildInitialPermissionState(sections)
}

/**
 * Получает иконку по имени
 * @param {string} iconName - имя иконки
 * @returns {Object|null}
 */
export function getIcon(iconName) {
  return moduleManager.getIcon(iconName)
}

/**
 * Валидирует всю конфигурацию
 * @returns {Promise<Object>}
 */
export async function validateAll() {
  return await moduleManager.validateAll()
}

/**
 * Получает статистику по модулям
 * @returns {Promise<Object>}
 */
export async function getStatistics() {
  return await moduleManager.getStatistics()
}

/**
 * Получает конфигурацию роута
 * @param {string} routeName - имя роута
 * @returns {Promise<Object|null>}
 */
export async function getRouteConfig(routeName) {
  return await moduleManager.getRouteConfig(routeName)
}

/**
 * Получает опции маршрутов для выбора (ядро + модули, включая вложенные)
 * @returns {Promise<Array<{ id: string, name: string }>>}
 */
export async function getAvailableRouteOptions() {
  await moduleManager.getStatistics()

  const byId = new Map()

  const coreRoutes = coreRoutesManager.getAllCoreRoutes()
  coreRoutes.forEach(route => {
    if (route.name) {
      byId.set(route.name, {
        id: route.name,
        name: resolveRouteTitle(route, route.name),
      })
    }
  })

  const routeManager = moduleManager.routes
  const moduleNames = routeManager.getAllRouteNamesIncludingNested()
  moduleNames.forEach(name => {
    if (byId.has(name)) return
    const config = routeManager.getRouteConfig(name)
    byId.set(name, { id: name, name: resolveRouteTitle(config, name) })
  })

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Получает эндпоинт по имени
 * @param {string} endpointName - имя эндпоинта
 * @returns {Promise<string|null>}
 */
export async function getEndpoint(endpointName) {
  return await moduleManager.getEndpoint(endpointName)
}

/**
 * Очищает весь кеш
 */
export function clearCache() {
  moduleManager.clearCache()
}

export { ModuleManager } from './ModuleManager.js'
export { RouteManager } from './routes/RouteManager.js'
export { EndpointManager } from './api/EndpointManager.js'
export { IconManager } from './icons/IconManager.js'
export { RouteGenerator } from './routes/RouteGenerator.js'
export { CoreRoutesManager } from './routes/CoreRoutesManager.js'
export { ModuleLoader } from './core/ModuleLoader.js'
export { PermissionRulesManager } from './permissions/PermissionRulesManager.js'
export { PermissionSectionsManager } from './permissions/PermissionSectionsManager.js'
export { RouteGuardsManager } from './routing/RouteGuardsManager.js'

export default moduleManager
