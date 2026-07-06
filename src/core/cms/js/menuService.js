/**
 * СЕРВИС ДЛЯ РАБОТЫ С МЕНЮ
 * 
 * Загружает и управляет конфигурацией меню через API.
 * Поддерживает кеширование и обновление в реальном времени.
 */

import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'
import { getIcon, preloadMenuIconsFromData } from '@/config/icons-mapping.js'
import { markRaw } from 'vue'
import { logError, logWarn } from '@/js/utils/logError.js'

// In-memory кеш меню. Прогревается в main.js до монтирования, поэтому MenuList
// может синхронно отрисовать меню с первого кадра (см. peekCachedMenu).
let menuCache = null
let cacheTimestamp = null
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

function persistMenuCache(data) {
  menuCache = data
  cacheTimestamp = Date.now()
}

/**
 * Синхронно возвращает кеш меню из памяти (без обращения к сети).
 * @returns {Object|null}
 */
export function peekCachedMenu() {
  return menuCache && cacheTimestamp ? menuCache : null
}

/**
 * Проверяет, актуален ли in-memory кэш меню (без сетевого запроса).
 * @returns {boolean}
 */
export function isMenuCacheFresh() {
  if (!menuCache || !cacheTimestamp) {
    return false
  }
  return Date.now() - cacheTimestamp < CACHE_TTL
}

/**
 * Получает меню для текущего пользователя
 * @param {boolean} forceRefresh - Принудительно обновить кеш
 * @returns {Promise<Object>} - Объект с menu_items и separators
 */
export async function getUserMenu(forceRefresh = false) {
  // Проверяем кеш
  if (!forceRefresh && menuCache && cacheTimestamp) {
    const now = Date.now()
    if (now - cacheTimestamp < CACHE_TTL) {
      return menuCache
    }
  }

  try {
    const response = await apiClient.get(endpoints.cms.menu.userMenu)
    
    if (response.success) {
      await preloadMenuIconsFromData(response.data)
      persistMenuCache(response.data)
      return response.data
    }
    
    logError('Ошибка загрузки меню:', response.error)
    return { menu_items: [], separators: [] }
  } catch (error) {
    logError('Ошибка загрузки меню:', error)
    return { menu_items: [], separators: [] }
  }
}

/**
 * Очищает кеш меню
 */
export function clearMenuCache() {
  menuCache = null
  cacheTimestamp = null
}

/**
 * Прогревает кэш меню из session-bootstrap (без сетевого запроса).
 * @param {object} menuData - { menu_items, separators }
 */
export async function applyMenuBootstrap(menuData) {
  if (!menuData || typeof menuData !== 'object') {
    return { menu_items: [], separators: [] }
  }
  const payload = {
    menu_items: menuData.menu_items || [],
    separators: menuData.separators || [],
  }
  await preloadMenuIconsFromData(payload)
  persistMenuCache(payload)
  return menuCache
}

/**
 * Преобразует данные меню из API в формат для компонентов
 * @param {Object} menuData - Данные из API
 * @returns {Array} - Массив секций меню для отображения
 */
export function transformMenuData(menuData) {
  const { menu_items = [] } = menuData
  
  return menu_items.map(item => transformMenuItem(item))
}

/**
 * Преобразует элемент меню
 * @param {Object} item - Элемент меню из API
 * @returns {Object} - Преобразованный элемент
 */
function resolveMenuIcon(icon) {
  if (!icon) return null
  if (typeof icon !== 'string') return icon
  const resolved = getIcon(icon)
  return resolved ? markRaw(resolved) : null
}

function transformMenuItem(item) {
  const transformed = {
    id: item.id,
    routeName: item.route_name,
    name: item.name,
    title: item.name,
    icon: resolveMenuIcon(item.icon),
    order: item.order,
    item_type: item.item_type // Сохраняем тип элемента
  }

  // Добавляем page для offcanvas элементов
  if (item.item_type === 'offcanvas' && item.page) {
    transformed.page = item.page
    transformed.isOffcanvas = true
  }

  // Добавляем внешнюю ссылку
  if (item.item_type === 'external' && item.external_url) {
    transformed.externalUrl = item.external_url
    transformed.external_url = item.external_url // Дублируем для совместимости
  }

  // Обрабатываем дочерние элементы - сохраняем исходный порядок из API
  if (item.children && item.children.length > 0) {
    // Сохраняем исходный порядок элементов из API
    // Разделяем на children (группы) и list (простые элементы), но сохраняем порядок
    const children = []
    const list = []
    
    // Проходим по дочерним элементам в исходном порядке
    item.children.forEach(child => {
      // Вложенные группы — элементы, имеющие собственных детей
      if (child.children && child.children.length > 0) {
        children.push(transformMenuItem(child))
      } else {
        // Простые элементы - всё остальное (routes, offcanvas, external без детей)
        const listItem = {
          routeName: child.route_name,
          name: child.name,
          icon: resolveMenuIcon(child.icon),
          page: child.page,
          isOffcanvas: child.item_type === 'offcanvas',
          item_type: child.item_type, // Сохраняем тип элемента
          order: child.order // Сохраняем order для правильной сортировки
        }
        
        // Добавляем внешнюю ссылку для external элементов
        if (child.item_type === 'external' && child.external_url) {
          listItem.externalUrl = child.external_url
          listItem.external_url = child.external_url // Дублируем для совместимости
        }
        
        list.push(listItem)
      }
    })
    
    if (children.length > 0) {
      transformed.children = children
    }
    
    if (list.length > 0) {
      transformed.list = list
    }
  }

  return transformed
}

/**
 * Получает разделители в формате для компонентов
 * @param {Array} separators - Разделители из API
 * @param {Array} menuItems - Элементы меню из API (для вычисления индексов)
 * @returns {Object} - Объект {byOrderIndex: {index: name}, separatorsList: [...]}
 */
export function transformSeparators(separators, menuItems = []) {
  const byOrderIndex = {}
  
  // Сортируем разделители по before_order
  const sortedSeparators = [...separators]
    .filter(sep => sep.is_active)
    .sort((a, b) => a.before_order - b.before_order)
  
  // Для каждого разделителя находим индекс первого элемента с order >= before_order
  sortedSeparators.forEach(sep => {
    // Ищем индекс первого элемента меню с order >= before_order
    const index = menuItems.findIndex(item => item.order >= sep.before_order)
    
    if (index !== -1) {
      byOrderIndex[index] = sep.name
    } else if (menuItems.length > 0) {
      // Если разделитель должен быть после всех элементов,
      // показываем его после последнего
      byOrderIndex[menuItems.length] = sep.name
    }
  })
  
  return { byOrderIndex, separatorsList: sortedSeparators }
}

/**
 * Проверяет, нужно ли показывать разделитель перед элементом
 * @param {number} index - Индекс элемента
 * @param {Object} separatorsConfig - Конфигурация разделителей
 * @returns {boolean}
 */
export function shouldShowSeparatorAt(index, separatorsConfig) {
  return separatorsConfig.byOrderIndex && 
         separatorsConfig.byOrderIndex[index] !== undefined
}

/**
 * Получает текст разделителя по индексу
 * @param {number} index - Индекс элемента
 * @param {Object} separatorsConfig - Конфигурация разделителей
 * @returns {string|null}
 */
export function getSeparatorTextAt(index, separatorsConfig) {
  if (separatorsConfig.byOrderIndex && separatorsConfig.byOrderIndex[index]) {
    return separatorsConfig.byOrderIndex[index]
  }
  return null
}

// ======= Административные функции =======

/**
 * Получает список всех элементов меню (для админов)
 * @param {Object} params - Параметры запроса
 * @returns {Promise<Array>}
 */
export async function getMenuItems(params = {}) {
  const queryParams = new URLSearchParams()
  
  if (params.parentId !== undefined) {
    queryParams.append('parent_id', params.parentId)
  }
  if (params.includeInactive) {
    queryParams.append('include_inactive', 'true')
  }
  
  const url = `${endpoints.cms.menu.items}?${queryParams.toString()}`
  const response = await apiClient.get(url)
  
  if (response.success) {
    return response.data
  }
  
  throw new Error(response.error || 'Ошибка загрузки элементов меню')
}

/**
 * Создает новый элемент меню
 * @param {Object} data - Данные элемента
 * @returns {Promise<Object>}
 */
export async function createMenuItem(data) {
  const response = await apiClient.post(endpoints.cms.menu.items, data)
  
  if (response.success) {
    clearMenuCache()
    return response.data
  }
  
  throw new Error(response.error || 'Ошибка создания элемента меню')
}

/**
 * Обновляет элемент меню
 * @param {number} id - ID элемента
 * @param {Object} data - Данные для обновления
 * @returns {Promise<Object>}
 */
export async function updateMenuItem(id, data) {
  const response = await apiClient.put(endpoints.cms.menu.itemDetail(id), data)
  
  if (response.success) {
    clearMenuCache()
    return response.data
  }
  
  throw new Error(response.error || 'Ошибка обновления элемента меню')
}

/**
 * Удаляет элемент меню
 * @param {number} id - ID элемента
 * @returns {Promise<void>}
 */
export async function deleteMenuItem(id) {
  const response = await apiClient.delete(endpoints.cms.menu.itemDetail(id))
  
  if (response.success) {
    clearMenuCache()
    return
  }
  
  throw new Error(response.error || 'Ошибка удаления элемента меню')
}

/**
 * Изменяет порядок элементов меню
 * @param {Array} items - Массив {id, order}
 * @returns {Promise<void>}
 */
export async function reorderMenuItems(items) {
  const response = await apiClient.post(endpoints.cms.menu.reorder, { items })
  
  if (response.success) {
    clearMenuCache()
    return
  }
  
  throw new Error(response.error || 'Ошибка изменения порядка')
}

/**
 * Получает список разделителей
 * @returns {Promise<Array>}
 */
export async function getMenuSeparators() {
  const response = await apiClient.get(endpoints.cms.menu.separators)
  
  if (response.success) {
    return response.data
  }
  
  throw new Error(response.error || 'Ошибка загрузки разделителей')
}

/**
 * Создает разделитель
 * @param {Object} data - Данные разделителя
 * @returns {Promise<Object>}
 */
export async function createMenuSeparator(data) {
  const response = await apiClient.post(endpoints.cms.menu.separators, data)
  
  if (response.success) {
    clearMenuCache()
    return response.data
  }
  
  throw new Error(response.error || 'Ошибка создания разделителя')
}

/**
 * Обновляет разделитель
 * @param {number} id - ID разделителя
 * @param {Object} data - Данные для обновления
 * @returns {Promise<Object>}
 */
export async function updateMenuSeparator(id, data) {
  const response = await apiClient.put(endpoints.cms.menu.separatorDetail(id), data)
  
  if (response.success) {
    clearMenuCache()
    return response.data
  }
  
  throw new Error(response.error || 'Ошибка обновления разделителя')
}

/**
 * Удаляет разделитель
 * @param {number} id - ID разделителя
 * @returns {Promise<void>}
 */
export async function deleteMenuSeparator(id) {
  const response = await apiClient.delete(endpoints.cms.menu.separatorDetail(id))
  
  if (response.success) {
    clearMenuCache()
    return
  }
  
  throw new Error(response.error || 'Ошибка удаления разделителя')
}

/**
 * Получает список доступных иконок
 * @returns {Promise<Array>}
 */
export async function getAvailableIcons() {
  const response = await apiClient.get(endpoints.cms.menu.availableIcons)
  
  if (response.success) {
    return response.data
  }
  
  throw new Error(response.error || 'Ошибка загрузки иконок')
}

/**
 * Восстанавливает пункты меню из populate-функций миграций (restore_menu)
 * @returns {Promise<Object>}
 */
export async function restoreMenuFromMigrations() {
  const response = await apiClient.post(endpoints.cms.menu.restore, {})

  if (response.success) {
    clearMenuCache()
    return response.data
  }

  throw new Error(response.error || response.message || 'Ошибка восстановления меню')
}

/**
 * Записывает лог доступа к элементу меню
 * @param {number} menuItemId - ID элемента меню
 * @returns {Promise<void>}
 */
export async function logMenuAccess(menuItemId) {
  try {
    await apiClient.post(endpoints.cms.menu.accessLog, { menu_item_id: menuItemId })
  } catch (error) {
    // Логирование не критично, но пишем безопасно (без сырого объекта ошибки)
    logWarn('Ошибка логирования доступа к меню', error)
  }
}

export default {
  getUserMenu,
  applyMenuBootstrap,
  peekCachedMenu,
  clearMenuCache,
  transformMenuData,
  transformSeparators,
  shouldShowSeparatorAt,
  getSeparatorTextAt,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
  getMenuSeparators,
  createMenuSeparator,
  updateMenuSeparator,
  deleteMenuSeparator,
  getAvailableIcons,
  logMenuAccess
}