/**
 * МЕНЕДЖЕР УПРАВЛЕНИЯ ЭНДПОИНТАМИ МОДУЛЕЙ
 * 
 * Класс для загрузки и управления API эндпоинтами
 * из всех модулей системы (core и внешние)
 */

import { ModuleLoader } from '../core/ModuleLoader.js'

import { logWarn } from '@/js/utils/logError.js'

export class EndpointManager extends ModuleLoader {
  constructor() {
    super()
    this.endpoints = new Map()
    this.initialized = false
  }

  /**
   * Инициализация менеджера эндпоинтов
   */
  async initialize() {
    if (this.initialized) {
      return
    }

    await this.loadEndpoints()
    this.initialized = true
  }

  /**
   * Рекурсивно разворачивает вложенные объекты эндпоинтов
   * @param {Object} obj - объект с эндпоинтами
   * @param {string} prefix - префикс для ключей
   * @returns {Object} - плоский объект с эндпоинтами
   */
  flattenEndpoints(obj, prefix = '') {
    const result = {}

    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key

      if (typeof value === 'string') {
        // Это конечный эндпоинт (строка)
        result[fullKey] = value
      } else if (typeof value === 'function') {
        // Это функция, которая возвращает эндпоинт
        result[fullKey] = value
      } else if (value && typeof value === 'object') {
        // Это вложенный объект, разворачиваем рекурсивно
        Object.assign(result, this.flattenEndpoints(value, fullKey))
      }
    })

    return result
  }

  /**
   * Восстанавливает вложенную структуру из плоских ключей
   * @param {Object} flat - плоский объект с точечной нотацией
   * @returns {Object} - объект с вложенной структурой
   */
  unflattenEndpoints(flat) {
    const result = {}

    Object.entries(flat).forEach(([key, value]) => {
      const parts = key.split('.')
      let current = result

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // Последняя часть - присваиваем значение
          current[part] = value
        } else {
          // Промежуточная часть - создаем объект если нет
          if (!current[part]) {
            current[part] = {}
          }
          current = current[part]
        }
      })
    })

    return result
  }

  /**
   * Загружает все endpoints.js из модулей
   */
  async loadEndpoints() {
    const endpointsModules = await this.loadAllModulesAsync('js/endpoints.js')

    Object.entries(endpointsModules).forEach(([path, module]) => {
      // Получаем первый экспорт из модуля (например, biEndpoints, cmsEndpoints)
      const exportedEndpoints = Object.values(module)[0]

      if (exportedEndpoints && typeof exportedEndpoints === 'object') {
        // Разворачиваем вложенную структуру эндпоинтов для индексации
        const flatEndpoints = this.flattenEndpoints(exportedEndpoints)

        Object.entries(flatEndpoints).forEach(([name, endpoint]) => {
          if (!this.endpoints.has(name)) {
            this.endpoints.set(name, {
              value: endpoint,
              _modulePath: path
            })
          } else {
            logWarn(`Дублирующийся эндпоинт: ${name} в ${path}`)
          }
        })
      }
    })
  }

  /**
   * Получает эндпоинт по имени
   * @param {string} name - имя эндпоинта
   * @returns {string|null}
   */
  getEndpoint(name) {
    const endpoint = this.endpoints.get(name)
    return endpoint ? endpoint.value : null
  }

  /**
   * Получает все эндпоинты в плоской структуре
   * @returns {Object}
   */
  getAllEndpointsFlat() {
    const result = {}
    this.endpoints.forEach((data, name) => {
      result[name] = data.value
    })
    return result
  }

  /**
   * Получает все эндпоинты с вложенной структурой (для обратной совместимости)
   * @returns {Object}
   */
  getAllEndpoints() {
    const flat = this.getAllEndpointsFlat()
    return this.unflattenEndpoints(flat)
  }

  /**
   * Проверяет существование эндпоинта
   * @param {string} name - имя эндпоинта
   * @returns {boolean}
   */
  hasEndpoint(name) {
    return this.endpoints.has(name)
  }

  /**
   * Получает эндпоинты по префиксу
   * @param {string} prefix - префикс имени эндпоинта
   * @returns {Object}
   */
  getEndpointsByPrefix(prefix) {
    const result = {}
    
    this.endpoints.forEach((data, name) => {
      if (name.startsWith(prefix)) {
        result[name] = data.value
      }
    })

    return result
  }

  /**
   * Фильтрует эндпоинты по условию
   * @param {Function} predicate - функция-предикат
   * @returns {Object}
   */
  filterEndpoints(predicate) {
    const result = {}
    
    this.endpoints.forEach((data, name) => {
      if (predicate(name, data.value)) {
        result[name] = data.value
      }
    })

    return result
  }

  /**
   * Получает статистику по эндпоинтам
   * @returns {Object}
   */
  getStatistics() {
    const coreEndpoints = []
    const moduleEndpoints = []

    this.endpoints.forEach((data, name) => {
      if (data._modulePath.includes('/core/')) {
        coreEndpoints.push(name)
      } else {
        moduleEndpoints.push(name)
      }
    })

    return {
      total: this.endpoints.size,
      core: coreEndpoints.length,
      modules: moduleEndpoints.length
    }
  }

  /**
   * Получает список всех имен эндпоинтов
   * @returns {Array<string>}
   */
  getAllEndpointNames() {
    return Array.from(this.endpoints.keys())
  }

  /**
   * Валидирует эндпоинты
   * @returns {Object}
   */
  validateEndpoints() {
    const errors = []
    const warnings = []

    this.endpoints.forEach((data, name) => {
      // Проверяем, что это строка или функция (для динамических эндпоинтов)
      if (typeof data.value !== 'string' && typeof data.value !== 'function') {
        errors.push(`Эндпоинт "${name}" имеет неверный тип: ${typeof data.value}`)
        return // Прерываем дальнейшую проверку для этого эндпоинта
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}

export default EndpointManager

