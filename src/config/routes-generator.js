/**
 * ГЕНЕРАТОР МАРШРУТОВ ИЗ МОДУЛЕЙ
 * 
 * Этот модуль автоматически загружает маршруты из всех модулей системы:
 * - config/routes.js - системные маршруты (главная, 404, logout, auth)
 * - core модули - роуты из core на любом уровне вложенности
 * - modules - роуты из modules на любом уровне вложенности
 * 
 * Структура:
 * - config/routes.js содержит coreRoutes и authRoutes
 * - каждый модуль и подмодуль имеет свой файл routes.js в папке js
 * - роуты загружаются динамически без захардкоженных путей
 * - поддерживаются вложенные модули (например: crm/project-ed/js/routes.js)
 * 
 * Основные функции:
 * - loadModuleRoutes() - загружает роуты из всех модулей
 * - generateRoutesFromConfig() - генерирует маршруты для Vue Router
 * - generateAllRoutes() - генерирует полную конфигурацию маршрутов
 */

import { generateMenuConfig } from '@/config/menu-loader.js';
import coreRoutesConfig from '@/config/routes.js';

// Кеш для конфигурации меню
let menuConfigCache = null

// Асинхронная функция для получения конфигурации меню
async function getMenuConfig() {
  if (!menuConfigCache) {
    menuConfigCache = await generateMenuConfig()
  }
  return menuConfigCache
}

// Предварительная загрузка всех компонентов из модулей и core
// Используем import.meta.glob для создания маппинга всех .vue файлов
const coreComponents = import.meta.glob('../**/*.vue')
const modulesComponents = import.meta.glob('../../../../modules/**/client/**/*.vue')

// Создаем единый маппинг компонентов
const componentsMap = {
  ...coreComponents,
  ...modulesComponents
}

/**
 * Получает функцию загрузки компонента по пути
 * @param {string} componentPath - путь к компоненту с алиасом (@/... или @/modules/...)
 * @returns {Function|null} - функция для загрузки компонента или null
 */
function getComponentLoader(componentPath) {
  // Преобразуем путь с алиасом в относительный путь для поиска в маппинге
  let searchPath
  
  if (componentPath.startsWith('@/modules/')) {
    // @/modules/video_analysis/client/... -> ../../../../modules/video_analysis/client/...
    searchPath = componentPath.replace('@/modules/', '../../../../modules/')
  } else if (componentPath.startsWith('@/')) {
    // @/core/... -> ../core/...
    searchPath = componentPath.replace('@/', '../')
  } else {
    return null
  }
  
  // Ищем компонент в маппинге
  const loader = componentsMap[searchPath]
  
  if (!loader) {
    console.warn(`Компонент не найден в маппинге: ${componentPath} (искали: ${searchPath})`)
  }
  
  return loader || null
}

/**
 * Автоматически загружает все routes.js из core модулей
 * @returns {Object} - объект со всеми роутами из core модулей
 */
function loadCoreModuleRoutes() {
  const coreRoutes = {}
  
  // Используем import.meta.glob для автоматической загрузки всех routes.js из core
  // Паттерн **/js/routes.js находит routes.js на любом уровне вложенности
  const coreModules = import.meta.glob('../core/**/js/routes.js', { eager: true })

  Object.entries(coreModules).forEach(([, module]) => {
    const routes = module.default || {}
    Object.assign(coreRoutes, routes)
  })
  
  return coreRoutes
}

/**
 * Автоматически загружает все routes.js из modules
 * @returns {Object} - объект со всеми роутами из modules
 */
function loadModulesRoutes() {
  const modulesRoutes = {}
  
  // Модули из папки modules/ ищутся по структуре modules/<module_name>/client/js/
  const modules = import.meta.glob('../../../../modules/*/client/js/routes.js', { eager: true })
  
  Object.entries(modules).forEach(([, module]) => {
    const routes = module.default || {}
    Object.assign(modulesRoutes, routes)
  })
  
  return modulesRoutes
}

/**
 * Загружает все роуты из всех модулей
 * @returns {Object} - объект со всеми доступными роутами
 */
function loadAllModuleRoutes() {
  const coreRoutes = loadCoreModuleRoutes()
  const modulesRoutes = loadModulesRoutes()
  
  return {
    ...coreRoutes,
    ...modulesRoutes
  }
}

// Кешируем загруженные роуты
let cachedRoutes = null

/**
 * Получает конфигурацию маршрута по имени
 * @param {string} routeName - имя маршрута
 * @returns {Object|null} - конфигурация маршрута или null
 */
function getRouteConfig(routeName) {
  if (!cachedRoutes) {
    cachedRoutes = loadAllModuleRoutes()
  }
  return cachedRoutes[routeName] || null
}

/**
 * Преобразует строковый путь к компоненту в функцию lazy import
 * @param {string} componentPath - путь к компоненту (например, "@/core/cms/adp/user/ParentLayout.vue")
 * @returns {Function} - функция для ленивой загрузки компонента
 */
function createLazyImport(componentPath) {
  // Используем предзагруженный маппинг компонентов
  const loader = getComponentLoader(componentPath)
  
  if (loader) {
    return loader
  }
  
  // Fallback: если компонент не найден в маппинге, показываем предупреждение
  console.error(`Не удалось создать lazy import для: ${componentPath}`)
  
  // Возвращаем заглушку
  return () => Promise.reject(new Error(`Component not found: ${componentPath}`))
}

/**
 * Преобразует конфигурацию подраздела в дочерний маршрут Vue Router
 * @param {Object} item - объект подраздела из JSON конфигурации
 * @returns {Object|Array|null} - объект маршрута Vue Router, массив маршрутов или null
 */
function transformSubItem(item) {
  // Пропускаем offcanvas элементы (они не являются реальными маршрутами)
  if (item.isOffcanvas) {
    return null
  }

  // Если это группа без маршрута (только children), возвращаем все дочерние маршруты
  if (!item.routeName && (item.children || item.list)) {
    const childRoutes = []
    
    // Обрабатываем children
    if (item.children && item.children.length > 0) {
      const transformedChildren = item.children
        .map(transformSubItem)
        .filter(child => child !== null)
      childRoutes.push(...transformedChildren)
    }
    
    // Обрабатываем list
    if (item.list && item.list.length > 0) {
      const transformedList = item.list
        .map(transformSubItem)
        .filter(child => child !== null)
      childRoutes.push(...transformedList)
    }
    
    return childRoutes.length > 0 ? childRoutes : null
  }

  // Получаем конфигурацию маршрута по имени
  const routeConfig = getRouteConfig(item.routeName || item.path)
  if (!routeConfig) {
    return null
  }

  const route = {
    path: routeConfig.path,
    name: item.routeName || item.path, // Используем routeName как name для совместимости
    component: createLazyImport(routeConfig.component),
    meta: {
      title: item.name || item.title, // Используем название из меню как заголовок по умолчанию
      ...routeConfig.meta, // Перезаписываем метаданными из конфигурации
    }
  }

  // Добавляем redirect если указан
  if (routeConfig.redirect) {
    // Проверяем, является ли redirect именем маршрута или путем
    if (routeConfig.redirect.startsWith('/')) {
      route.redirect = routeConfig.redirect
    } else {
      route.redirect = { name: routeConfig.redirect }
    }
  }

  // Рекурсивно обрабатываем дочерние элементы
  const childRoutes = []
  
  // Обрабатываем children
  if (item.children && item.children.length > 0) {
    const transformedChildren = item.children
      .map(transformSubItem)
      .filter(child => child !== null)
    
    // Если дочерний элемент вернул массив (группа без маршрута), разворачиваем его
    transformedChildren.forEach(child => {
      if (Array.isArray(child)) {
        childRoutes.push(...child)
      } else {
        childRoutes.push(child)
      }
    })
  }
  
  // Обрабатываем list
  if (item.list && item.list.length > 0) {
    const transformedList = item.list
      .map(transformSubItem)
      .filter(child => child !== null)
      
    // Если дочерний элемент вернул массив (группа без маршрута), разворачиваем его
    transformedList.forEach(child => {
      if (Array.isArray(child)) {
        childRoutes.push(...child)
      } else {
        childRoutes.push(child)
      }
    })
  }

  if (childRoutes.length > 0) {
    route.children = childRoutes
  }

  return route
}

/**
 * Преобразует секцию меню в маршрут Vue Router
 * @param {Object} section - секция меню из JSON конфигурации
 * @returns {Object|null} - объект маршрута Vue Router или null
 */
function transformMenuSection(section) {
  // Получаем конфигурацию маршрута по имени
  const routeConfig = getRouteConfig(section.routeName)
  if (!routeConfig) {
    return null
  }

  const route = {
    path: routeConfig.path,
    name: section.routeName,
    component: createLazyImport(routeConfig.component),
    meta: {
      title: section.title,
      ...routeConfig.meta,
    }
  }

  // Добавляем redirect если указан
  if (routeConfig.redirect) {
    // Проверяем, является ли redirect именем маршрута или путем
    if (routeConfig.redirect.startsWith('/')) {
      route.redirect = routeConfig.redirect
    } else {
      route.redirect = { name: routeConfig.redirect }
    }
  }

  // Обрабатываем дочерние маршруты из list и children
  const childRoutes = []
  
  // Обрабатываем children
  if (section.children && section.children.length > 0) {
    const transformedChildren = section.children
      .map(transformSubItem)
      .filter(child => child !== null)
      
    // Если дочерний элемент вернул массив (группа без маршрута), разворачиваем его
    transformedChildren.forEach(child => {
      if (Array.isArray(child)) {
        childRoutes.push(...child)
      } else {
        childRoutes.push(child)
      }
    })
  }
  
  // Обрабатываем list
  if (section.list && section.list.length > 0) {
    const transformedList = section.list
      .map(transformSubItem)
      .filter(child => child !== null)
      
    // Если дочерний элемент вернул массив (группа без маршрута), разворачиваем его
    transformedList.forEach(child => {
      if (Array.isArray(child)) {
        childRoutes.push(...child)
      } else {
        childRoutes.push(child)
      }
    })
  }

  if (childRoutes.length > 0) {
    route.children = childRoutes
  }

  return route
}

/**
 * Генерирует массив маршрутов из JSON конфигурации меню
 * @returns {Promise<Array>} - массив маршрутов для Vue Router
 */
export async function generateRoutesFromConfig() {
  try {
    const menuConfig = await getMenuConfig()
    const routes = menuConfig.menuSections
      .map(transformMenuSection)
      .filter(route => route !== null) // Убираем невалидные маршруты
    
    return routes
  } catch {
    return []
  }
}

/**
 * Преобразует строковый путь компонента в динамический импорт
 * @param {string} componentPath - путь к компоненту (например: "@/components/NotFound.vue")
 * @returns {Function} - функция динамического импорта
 */
function transformComponentPath(componentPath) {
  // Используем предзагруженный маппинг компонентов
  const loader = getComponentLoader(componentPath)
  
  if (loader) {
    return loader
  }
  
  // Fallback: если компонент не найден в маппинге
  console.error(`Не удалось преобразовать путь компонента: ${componentPath}`)
  
  // Возвращаем заглушку
  return () => Promise.reject(new Error(`Component not found: ${componentPath}`))
}

/**
 * Преобразует маршрут из JSON формата в объект Vue Router
 * @param {Object} route - маршрут из JSON конфигурации
 * @returns {Object} - маршрут с компонентом как функцией динамического импорта
 */
function transformRoute(route) {
  const transformedRoute = { ...route }
  
  // Преобразуем строковый путь компонента в динамический импорт
  if (route.component && typeof route.component === 'string') {
    transformedRoute.component = transformComponentPath(route.component)
  }
  
  return transformedRoute
}

/**
 * Загружает и преобразует основные маршруты из конфигурации
 * @returns {Array} - массив основных маршрутов
 */
function loadCoreRoutes() {
  try {
    return coreRoutesConfig.coreRoutes.map(transformRoute)
  } catch {
    return []
  }
}

/**
 * Загружает и преобразует маршруты аутентификации из конфигурации
 * @returns {Array} - массив маршрутов аутентификации
 */
function loadAuthRoutes() {
  try {
    return coreRoutesConfig.authRoutes.map(transformRoute)
  } catch {
    return []
  }
}

/**
 * Генерирует дополнительные служебные маршруты (основные и auth)
 * @returns {Array} - массив служебных маршрутов
 */
export function generateCoreRoutes() {
  const coreRoutes = loadCoreRoutes()
  const authRoutes = loadAuthRoutes()
  
  return [...coreRoutes, ...authRoutes]
}

/**
 * Получает только основные маршруты (без auth)
 * @returns {Array} - массив основных маршрутов
 */
export function getCoreRoutes() {
  return loadCoreRoutes()
}

/**
 * Получает только маршруты аутентификации
 * @returns {Array} - массив маршрутов аутентификации
 */
export function getAuthRoutes() {
  return loadAuthRoutes()
}

/**
 * Получает маршрут по имени из конфигурации
 * @param {string} routeName - имя маршрута
 * @returns {Object|undefined} - найденный маршрут
 */
export function getCoreRouteByName(routeName) {
  const allRoutes = generateCoreRoutes()
  return allRoutes.find(route => route.name === routeName)
}

/**
 * Получает все имена маршрутов из конфигурации
 * @returns {Array<string>} - массив имен маршрутов
 */
export function getAllCoreRouteNames() {
  const allRoutes = generateCoreRoutes()
  return allRoutes.map(route => route.name).filter(Boolean)
}

/**
 * Проверяет, является ли маршрут маршрутом аутентификации
 * @param {string} routeName - имя маршрута
 * @returns {boolean} - является ли маршрут auth маршрутом
 */
export function isAuthRoute(routeName) {
  const authRoutes = loadAuthRoutes()
  return authRoutes.some(route => route.name === routeName)
}

/**
 * Получает все имена маршрутов, которые уже созданы из меню
 * @param {Array} routes - массив маршрутов
 * @returns {Set} - набор имен маршрутов
 */
function getCreatedRouteNames(routes) {
  const names = new Set()
  
  function extractNames(routeArray) {
    routeArray.forEach(route => {
      if (route.name) names.add(route.name)
      if (route.children) extractNames(route.children)
    })
  }
  
  extractNames(routes)
  return names
}

/**
 * Создает отдельный маршрут из конфигурации
 * @param {string} routeName - имя маршрута
 * @param {Object} routeConfig - конфигурация маршрута
 * @returns {Object} - объект маршрута Vue Router
 */
function createStandaloneRoute(routeName, routeConfig) {
  const route = {
    path: routeConfig.path,
    name: routeName,
    component: createLazyImport(routeConfig.component),
    meta: {
      ...routeConfig.meta,
    }
  }

  // Добавляем redirect если указан
  if (routeConfig.redirect) {
    // Проверяем, является ли redirect именем маршрута или путем
    if (routeConfig.redirect.startsWith('/')) {
      route.redirect = routeConfig.redirect
    } else {
      route.redirect = { name: routeConfig.redirect }
    }
  }

  return route
}

/**
 * Генерирует недостающие маршруты (которые есть в модулях, но не в меню)
 * @param {Set} createdRouteNames - набор уже созданных имен маршрутов
 * @returns {Array} - массив недостающих маршрутов
 */
function generateMissingRoutes(createdRouteNames) {
  const missingRoutes = []
  const allModuleRoutes = loadAllModuleRoutes()
  
  // Проходим по всем маршрутам из модулей
  Object.entries(allModuleRoutes).forEach(([routeName, routeConfig]) => {
    // Если маршрут не был создан через меню, создаем его отдельно
    if (!createdRouteNames.has(routeName)) {
      try {
        const route = createStandaloneRoute(routeName, routeConfig)
        missingRoutes.push(route)
      } catch (error) {
        console.warn(`Не удалось создать маршрут ${routeName}:`, error)
      }
    }
  })
  
  return missingRoutes
}

/**
 * Генерирует полную конфигурацию маршрутов
 * @returns {Array} - полный массив маршрутов для приложения
 */
export async function generateAllRoutes() {
  const coreRoutes = generateCoreRoutes()
  const menuRoutes = await generateRoutesFromConfig()
  
  // Получаем имена уже созданных маршрутов
  const createdRouteNames = getCreatedRouteNames([...coreRoutes, ...menuRoutes])
  
  // Создаем недостающие маршруты из модулей
  const missingRoutes = generateMissingRoutes(createdRouteNames)
  
  return [
    ...coreRoutes,
    ...menuRoutes,
    ...missingRoutes
  ]
}

/**
 * ФУНКЦИИ ДЛЯ РАБОТЫ С АДАПТИВНЫМИ SEPARATORS
 */

/**
 * Генерирует адаптивные separators на основе текущих элементов меню
 * @returns {Promise<Object>} - объект с позициями separators
 */
export async function generateAdaptiveSeparators() {
  const separators = {}
  const menuConfig = await getMenuConfig()
  const menuSections = menuConfig.menuSections
  
  // Обрабатываем каждый раздел и ищем места для separators
  for (let i = 0; i < menuSections.length; i++) {
    const section = menuSections[i]
    
    // Проверяем, есть ли separator для данной позиции в конфигурации
    if (menuConfig.separators) {
      // Ищем separator по индексу в массиве
      const separatorByIndex = Object.keys(menuConfig.separators).find(key => {
        return parseInt(key) === i
      })
      
      if (separatorByIndex) {
        separators[i] = menuConfig.separators[separatorByIndex]
        continue
      }
      
      // Ищем separator по id элемента
      const separatorById = menuConfig.separators[section.id?.toString()]
      if (separatorById) {
        separators[i] = separatorById
        continue
      }
      
      // Ищем separator по имени роута
      const separatorByRoute = Object.keys(menuConfig.separators).find(key => {
        return key === section.routeName
      })
      
      if (separatorByRoute) {
        separators[i] = menuConfig.separators[separatorByRoute]
      }
    }
  }
  
  return separators
}

/**
 * Получает позицию separator для указанного индекса
 * @param {number} index - индекс элемента меню
 * @returns {Promise<string|null>} - название separator или null
 */
export async function getSeparatorByIndex(index) {
  const separators = await generateAdaptiveSeparators()
  return separators[index] || null
}

/**
 * Проверяет, должен ли отображаться separator перед указанным элементом
 * @param {number} index - индекс элемента меню
 * @returns {Promise<boolean>} - должен ли отображаться separator
 */
export async function shouldShowSeparator(index) {
  const separator = await getSeparatorByIndex(index)
  return separator !== null
}

/**
 * Получает структуру меню с информацией о separators
 * @returns {Promise<Object>} - объект с массивом элементов меню и информацией о separators
 */
export async function getMenuWithSeparators() {
  const menuConfig = await getMenuConfig()
  const menuSections = menuConfig.menuSections
  const separators = await generateAdaptiveSeparators()
  
  return {
    sections: menuSections,
    separators: separators,
    getSeparatorAt: (index) => separators[index] || null,
    hasSeparatorAt: (index) => Object.prototype.hasOwnProperty.call(separators, index)
  }
}

/**
 * Обновляет конфигурацию separators новыми значениями
 * @param {Object} newSeparators - новая конфигурация separators
 * @returns {Promise<Object>} - обновленная конфигурация меню
 */
export async function updateSeparatorsConfig(newSeparators) {
  // Примечание: эта функция возвращает обновленную конфигурацию
  // Для применения изменений нужно сохранить файл menu-config.json
  const menuConfig = await getMenuConfig()
  return {
    ...menuConfig,
    separators: newSeparators
  }
}

/**
 * ДОПОЛНИТЕЛЬНЫЕ СЛУЖЕБНЫЕ ФУНКЦИИ ДЛЯ РАБОТЫ С МАРШРУТАМИ И КОНФИГУРАЦИЕЙ
 */

/**
 * Получает все названия маршрутов из конфигурации
 * @returns {Promise<Array>} - массив имен маршрутов
 */
export async function getAllRouteNames() {
  const routes = await generateRoutesFromConfig()
  const names = []
  
  function extractNames(routeArray) {
    routeArray.forEach(route => {
      if (route.name) names.push(route.name)
      if (route.children) extractNames(route.children)
    })
  }
  
  extractNames(routes)
  return names
}

/**
 * Получает все доступные маршруты из модулей
 * @returns {Object} - объект со всеми маршрутами
 */
export function getAllAvailableRoutes() {
  return loadAllModuleRoutes()
}

/**
 * Получает конфигурацию маршрута по имени
 * @param {string} routeName - имя маршрута
 * @returns {Object|null} - конфигурация маршрута или null
 */
export function getRouteConfigByName(routeName) {
  return getRouteConfig(routeName)
}

/**
 * Валидирует конфигурацию маршрутов
 * @returns {Promise<Object>} - объект с результатами валидации
 */
export async function validateRoutesConfig() {
  const errors = []
  const warnings = []
  
  try {
    const menuConfig = await getMenuConfig()
    menuConfig.menuSections.forEach((section, index) => {
      const routeConfig = getRouteConfig(section.routeName)
      if (!routeConfig) {
        warnings.push(`Секция ${index + 1} "${section.title}" не содержит конфигурации маршрута`)
        return
      }
      
      if (!routeConfig.component) {
        errors.push(`Секция "${section.title}" не содержит component`)
      }
      
      if (!routeConfig.path) {
        errors.push(`Секция "${section.title}" не содержит path`)
      }
      
      // Проверяем, что компонент существует в маппинге
      if (routeConfig.component) {
        const loader = getComponentLoader(routeConfig.component)
        if (!loader) {
          errors.push(`Компонент "${routeConfig.component}" для секции "${section.title}" не найден`)
        }
      }
      
      // Валидация дочерних маршрутов
      if (section.list) {
        section.list.forEach(item => {
          const itemConfig = getRouteConfig(item.routeName || item.path)
          if (!item.isOffcanvas && !itemConfig) {
            errors.push(`Подраздел "${item.name}" в секции "${section.title}" не найден в конфигурации маршрутов`)
          } else if (itemConfig && itemConfig.component) {
            const loader = getComponentLoader(itemConfig.component)
            if (!loader) {
              errors.push(`Компонент "${itemConfig.component}" для подраздела "${item.name}" не найден`)
            }
          }
        })
      }
    })
  } catch (error) {
    errors.push(`Ошибка чтения конфигурации: ${error.message}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}
