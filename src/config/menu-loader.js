import menuOrderConfig from '@/config/menu-order-config.json'

// Кеш для загруженных конфигов и маппинга
let configsCache = null
let mappingCache = null

// Ленивая загрузка menu-config.json (не eager)
const coreModulesLoader = import.meta.glob('../core/**/js/menu-config.json')
// Модули из папки modules/ ищутся по структуре modules/<module_name>/client/js/
// Путь от src/config/menu-loader.js до modules/: ../../../../modules/
const modulesLoader = import.meta.glob('../../../../modules/*/client/js/menu-config.json')

/**
 * Автоматически загружает все menu-config.json из всех модулей
 * Использует кеширование для повторных вызовов
 */
export async function loadAllModuleMenuConfigs() {
  if (configsCache) {
    return configsCache
  }
  
  const allConfigs = {}
  
  // Загружаем все menu-config.json из core
  const corePromises = Object.entries(coreModulesLoader).map(async ([path, loader]) => {
    const module = await loader()
    const modulePath = path.replace('../', '').replace('/js/menu-config.json', '')
    allConfigs[modulePath] = module.default || module
  })
  
  // Загружаем все menu-config.json из modules
  const modulesPromises = Object.entries(modulesLoader).map(async ([path, loader]) => {
    const module = await loader()
    // Путь вида: ../../../../modules/video_analysis/client/js/menu-config.json
    // Преобразуем в: modules/video_analysis
    const modulePath = path
      .replace('../../../../modules/', 'modules/')
      .replace('/client/js/menu-config.json', '')
    allConfigs[modulePath] = module.default || module
  })
  
  await Promise.all([...corePromises, ...modulesPromises])
  
  configsCache = allConfigs
  return allConfigs
}

/**
 * Создает динамический маппинг routeName -> путь к модулю
 * Использует кеширование
 */
export async function createModulePathsMapping() {
  if (mappingCache) {
    return mappingCache
  }
  
  const allConfigs = await loadAllModuleMenuConfigs()
  const mapping = {}
  
  Object.entries(allConfigs).forEach(([modulePath, config]) => {
    if (config.menuSections && Array.isArray(config.menuSections)) {
      config.menuSections.forEach(section => {
        if (section.routeName) {
          if (!mapping[section.routeName]) {
            mapping[section.routeName] = modulePath
          }
        }
      })
    }
  })
  
  mappingCache = mapping
  return mapping
}

function filterSectionsByParent(sections, parentRouteName) {
  return sections.filter(section => {
    return section.parentRoute === parentRouteName
  })
}

function integrateChildrenSections(menuSections, allConfigs) {
  menuSections.forEach(section => {
    Object.values(allConfigs).forEach(config => {
      if (config.menuSections) {
        const childSections = filterSectionsByParent(config.menuSections, section.routeName)
        
        if (childSections.length > 0) {
          if (!section.children) {
            section.children = []
          }
          
          childSections.forEach(childSection => {
            // Проверяем, что эта секция еще не добавлена
            const alreadyAdded = section.children.some(
              existing => existing.routeName === childSection.routeName
            )
            
            if (!alreadyAdded) {
              section.children.push(childSection)
            }
          })
        }
      }
    })
  })
}

export async function generateMenuConfig() {
  const allConfigs = await loadAllModuleMenuConfigs()
  const modulePaths = await createModulePathsMapping()
  const menuOrder = menuOrderConfig.menuOrder || []
  
  const menuSections = []
  const processedSections = new Set()
  
  menuOrder.forEach(moduleName => {
    const modulePath = modulePaths[moduleName]
    
    if (!modulePath) {
      console.warn(`Модуль "${moduleName}" из menuOrder не найден среди загруженных модулей`)
      return
    }
    
    const menuConfig = allConfigs[modulePath]
    
    if (menuConfig && menuConfig.menuSections) {
      // Находим конкретную секцию с нужным routeName
      const targetSection = menuConfig.menuSections.find(
        section => section.routeName === moduleName
      )
      
      if (targetSection && !targetSection.parentRoute) {
        // Проверяем, не добавлена ли уже эта секция
        if (!processedSections.has(targetSection.routeName)) {
          menuSections.push(targetSection)
          processedSections.add(targetSection.routeName)
        }
      }
    }
  })
  
  integrateChildrenSections(menuSections, allConfigs)
  
  return {
    menuSections
  }
}

export async function validateMenuConfig() {
  const errors = []
  const warnings = []
  
  try {
    const allConfigs = await loadAllModuleMenuConfigs()
    const modulePaths = await createModulePathsMapping()
    const menuOrder = menuOrderConfig.menuOrder || []
    
    menuOrder.forEach(moduleName => {
      if (!modulePaths[moduleName]) {
        warnings.push(
          `Модуль "${moduleName}" присутствует в menuOrder, но не найден среди загруженных модулей`
        )
      }
    })
    
    menuOrder.forEach(moduleName => {
      const modulePath = modulePaths[moduleName]
      
      if (modulePath && !allConfigs[modulePath]) {
        warnings.push(
          `Модуль "${moduleName}" присутствует в menuOrder, но не найден конфиг меню по пути "${modulePath}/js/menu-config.json"`
        )
      }
    })
    
    Object.entries(allConfigs).forEach(([path, config]) => {
      if (!config.menuSections || !Array.isArray(config.menuSections)) {
        errors.push(
          `Конфиг меню "${path}/js/menu-config.json" должен содержать массив menuSections`
        )
      }
    })
  } catch (error) {
    errors.push(`Критическая ошибка при валидации конфигурации меню: ${error.message}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

export async function getAllModules() {
  const menuOrder = menuOrderConfig.menuOrder || []
  const modulePaths = await createModulePathsMapping()
  
  return Object.entries(modulePaths).map(([moduleName, modulePath]) => ({
    name: moduleName,
    enabled: menuOrder.includes(moduleName),
    path: modulePath
  }))
}

export function getEnabledModules() {
  return menuOrderConfig.menuOrder || []
}

export function isModuleEnabled(moduleName) {
  const menuOrder = menuOrderConfig.menuOrder || []
  return menuOrder.includes(moduleName)
}

/**
 * Сбросить кеш (для горячей перезагрузки в dev режиме)
 */
export function clearCache() {
  configsCache = null
  mappingCache = null
}

export default {
  generateMenuConfig,
  validateMenuConfig,
  getAllModules,
  getEnabledModules,
  isModuleEnabled,
  createModulePathsMapping,
  loadAllModuleMenuConfigs
}

