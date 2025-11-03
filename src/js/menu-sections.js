/**
 * СЕКЦИИ МЕНЮ
 * 
 * Загружает и трансформирует секции меню через модульную систему.
 * Использует ModuleManager для получения конфигурации меню из всех модулей.
 */

import { getIcon, generateMenuConfig, getSeparatorAt, shouldShowSeparator } from '@/modules/index.js'
import menuOrderConfig from '@menu-order-config'

// Кеш для конфигурации меню
let menuConfigCache = null

// Асинхронная функция для получения конфигурации меню
async function getMenuConfig() {
  if (!menuConfigCache) {
    menuConfigCache = await generateMenuConfig()
  }
  return menuConfigCache
}

function transformMenuSection(section) {
  return {
    ...section,
    icon: getIcon(section.icon)
  }
}

async function loadMenuSections() {
  try {
    const menuConfig = await getMenuConfig()
    const sections = menuConfig.menuSections.map(transformMenuSection)
    const orderConfig = menuOrderConfig.menuOrder
    if (orderConfig && orderConfig.length > 0) {
      return sortMenuSectionsByOrder(sections, orderConfig)
    }
    return sections
  } catch (error) {
    console.error('Ошибка загрузки конфигурации меню:', error)
    return []
  }
}

function sortMenuSectionsByOrder(sections, order) {
  const sectionMap = new Map()
  sections.forEach(section => {
    if (section.routeName) {
      sectionMap.set(section.routeName, section)
    }
  })
  
  const sortedSections = []
  order.forEach(routeName => {
    if (sectionMap.has(routeName)) {
      sortedSections.push(sectionMap.get(routeName))
      sectionMap.delete(routeName)
    }
  })
  
  sectionMap.forEach(section => {
    sortedSections.push(section)
  })
  
  return sortedSections
}

function generateExportName(routeName) {
  return `${routeName}MenuSection`
}

// Инициализация меню - вызывается один раз
let sectionsPromise = null
let menuSectionsData = {}

function initializeMenu() {
  if (!sectionsPromise) {
    sectionsPromise = loadMenuSections().then(async sections => {
      sections.forEach(section => {
        if (section.routeName) {
          const exportName = generateExportName(section.routeName)
          menuSectionsData[exportName] = section
        }
      })

      return sections
    })
  }
  return sectionsPromise
}

// Инициализируем меню сразу
const sections = await initializeMenu()

export const allMenuSections = sections
export const menuSections = menuSectionsData
export const AdminPanelMenuSection = menuSectionsData.AdminPanelMenuSection

export const getSeparator = (index) => {
  return getSeparatorAt(index)
}

export { shouldShowSeparator }