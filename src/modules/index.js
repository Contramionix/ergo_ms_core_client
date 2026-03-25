/**
 * ГЛАВНАЯ ТОЧКА ВХОДА ДЛЯ МОДУЛЬНОЙ СИСТЕМЫ
 * 
 * Экспортирует инициализированные инстансы всех менеджеров
 * и предоставляет API для работы с модулями системы
 */

import { ModuleManager } from './ModuleManager.js'
import { CoreRoutesManager } from './routes/CoreRoutesManager.js'
import coreRoutesConfig from '@/config/routes.js'

// Создаем главный менеджер модулей
export const moduleManager = new ModuleManager()

// Создаем менеджер базовых роутов
export const coreRoutesManager = new CoreRoutesManager(coreRoutesConfig)

/**
 * Генерирует все роуты для Vue Router
 * @returns {Promise<Array>}
 */
export async function generateAllRoutes() {
  const coreRoutes = coreRoutesManager.getAllCoreRoutes()
  return await moduleManager.generateAllRoutes(coreRoutes)
}

/**
 * Генерирует конфигурацию меню
 * @returns {Promise<Object>}
 */
export async function generateMenuConfig() {
  return await moduleManager.getMenuConfig()
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
 * Получает сепаратор по индексу
 * @param {number} index - индекс элемента меню
 * @returns {string|null}
 */
export function getSeparatorAt(index) {
  return moduleManager.getSeparatorAt(index)
}

/**
 * Проверяет, должен ли отображаться сепаратор
 * @param {number} index - индекс элемента меню
 * @returns {boolean}
 */
export function shouldShowSeparator(index) {
  return moduleManager.shouldShowSeparator(index)
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
 * Получает список всех модулей
 * @returns {Promise<Array>}
 */
export async function getAllModules() {
  return await moduleManager.getAllModules()
}

/**
 * Проверяет, включен ли модуль
 * @param {string} moduleName - имя модуля
 * @returns {Promise<boolean>}
 */
export async function isModuleEnabled(moduleName) {
  return await moduleManager.isModuleEnabled(moduleName)
}

/**
 * Получает список включенных модулей
 * @returns {Promise<Array<string>>}
 */
export async function getEnabledModules() {
  return await moduleManager.getEnabledModules()
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
        name: route.meta?.title || route.name
      })
    }
  })

  const routeManager = moduleManager.routes
  const moduleNames = routeManager.getAllRouteNamesIncludingNested()
  moduleNames.forEach(name => {
    if (byId.has(name)) return
    const config = routeManager.getRouteConfig(name)
    const title = config?.meta?.title || name
    byId.set(name, { id: name, name: title })
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

// Экспортируем классы для продвинутого использования
export { ModuleManager } from './ModuleManager.js'
export { RouteManager } from './routes/RouteManager.js'
export { MenuManager } from './menu/MenuManager.js'
export { EndpointManager } from './api/EndpointManager.js'
export { IconManager } from './icons/IconManager.js'
export { SeparatorManager } from './menu/SeparatorManager.js'
export { RouteGenerator } from './routes/RouteGenerator.js'
export { CoreRoutesManager } from './routes/CoreRoutesManager.js'
export { ModuleLoader } from './core/ModuleLoader.js'
export { PermissionRulesManager } from './permissions/PermissionRulesManager.js'
export { PermissionSectionsManager } from './permissions/PermissionSectionsManager.js'

// Экспортируем moduleManager как default
export default moduleManager

