/**
 * КОНФИГУРАЦИЯ МАРШРУТИЗАЦИИ ПРИЛОЖЕНИЯ ERGO MS
 * 
 * Данный файл содержит инициализацию Vue Router с автоматической генерацией
 * маршрутов из модульной системы. Это обеспечивает единый источник истины
 * для структуры приложения и устраняет дублирование кода.
 * 
 * Архитектура:
 * - modules/: модульная система управления роутами, меню, эндпоинтами и иконками
 * - menu-config.json: конфигурация меню модулей
 * - routes.js: конфигурация роутов модулей
 * - routers.js: инициализирует Vue Router с сгенерированными маршрутами
 * 
 * Функциональность:
 * - Автоматическая генерация маршрутов через ModuleManager
 * - Валидация конфигурации при инициализации
 * - Поддержка ленивой загрузки компонентов
 * - Настроена защита маршрутов через beforeEach guard
 * - Интегрирована система управления доступом через GroupsPolitics
 * - ООП подход с использованием менеджеров (RouteManager, MenuManager и др.)
 */

import { createRouter, createWebHistory } from 'vue-router'
import { checkToken } from '@/core/cms/adp/js/auth-index'
import { generateAllRoutes, validateAll, getPermissionRules } from '@/modules/index.js'
import { checkRouteAdpAccess, hasAnyModulePermission } from '@/core/cms/adp/js/accessControl'
import Cookies from 'js-cookie'
import { accessDeniedState } from './accessDeniedState'

// Кеш для правил проверки прав
let cachedPermissionRules = null

/**
 * Получает правила проверки прав (с кешированием)
 * @returns {Promise<Array>}
 */
async function getCachedPermissionRules() {
  if (cachedPermissionRules === null) {
    cachedPermissionRules = await getPermissionRules()
  }
  return cachedPermissionRules
}

/**
 * Проверка прав доступа к маршруту.
 * Объединяет проверку разрешений модулей и ADP URL-политик.
 * @param {Object} to - объект маршрута
 * @returns {Promise<{allowed: boolean, redirect?: string}>}
 */
async function checkRouteAccess(to) {
  // Загружаем правила динамически (с кешированием)
  const MODULE_PERMISSION_RULES = await getCachedPermissionRules()

  // 1) Проверка разрешений модулей по правилам
  for (let i = 0; i < MODULE_PERMISSION_RULES.length; i++) {
    const rule = MODULE_PERMISSION_RULES[i]
    const ruleMatches = rule.match(to)

    if (ruleMatches) {
      const hasAccess = await hasAnyModulePermission(rule.module, rule.permissions)

      if (!hasAccess) {
        accessDeniedState.active = true
        accessDeniedState.title = rule.title
        accessDeniedState.message = rule.message
        return { allowed: false, redirect: 'AccessDenied' }
      }
      // Если правило сработало и права есть, продолжаем проверку других правил
    }
  }

  // 2) Проверка ADP URL-политик для защищённых страниц
  if (to.meta?.requiresAuth && to.name !== 'AccessDenied') {
    try {
      const adpAllowed = await checkRouteAdpAccess(to.path)
      if (!adpAllowed) {
        return { allowed: false, redirect: 'AccessDenied' }
      }
    } catch {
      return { allowed: false, redirect: 'AccessDenied' }
    }
  }

  accessDeniedState.active = false
  return { allowed: true }
}

// Генерация маршрутов из JSON конфигурации (async)
const routes = await generateAllRoutes()

// Валидация конфигурации при запуске (async)
const validation = await validateAll()

routes.forEach((route) => {
  if (!route.meta || !Object.prototype.hasOwnProperty.call(route.meta, 'startRoute')) {
    route.meta = route.meta || {}
    route.meta.startRoute = false
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

async function runCheckToken() {
  const isChecked = await checkToken()
  return isChecked
}

router.beforeEach(async (to, from, next) => {
  try {
    const safeNext = (params) => {
      accessDeniedState.active = false
      return next(params)
    }

    // 1) нужна авторизация?
    if (to.meta.requiresAuth && !(await runCheckToken())) {
      // Очищаем токены при неудачной проверке
      import('./api/manager').then(({ apiClient }) => {
        apiClient.logout()
      })
      return safeNext({ name: 'StartPage' })
    }

    // requiresActiveOrganization для страниц CRM - проверяем сразу после авторизации
    const isWelcomePage = to.path === '/crm-remastered/welcome' || to.name === 'CRMRemasteredWelcome'
    const isCRMRoute = to.path && to.path.startsWith('/crm-remastered') && !isWelcomePage
    const hasRequiresActiveOrgFlag = to.meta && to.meta.requiresActiveOrganization === true
    const isCRMName = to.name && to.name.startsWith('CRMRemastered') && to.name !== 'CRMRemasteredWelcome'
    
    if ((isCRMRoute || isCRMName || hasRequiresActiveOrgFlag) && !isWelcomePage) {
      if (typeof window !== 'undefined' && window.localStorage) {
        const STORAGE_KEY = 'crm_active_organization'
        let hasActiveOrganization = false
        
        try {
          const currentUserId = Cookies.get('userId')
          const currentUserIdNum = currentUserId ? parseInt(currentUserId, 10) : null
          
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            try {
              const data = JSON.parse(stored)
              
              let org = null
              let orgUserId = null
              
              if (data.organization) {
                org = data.organization
                orgUserId = data.user_id || null
              } else {
                org = data
                orgUserId = null
              }
              
              if (org && (org.id || org.name)) {
                if (currentUserIdNum && orgUserId && orgUserId !== currentUserIdNum) {
                  localStorage.removeItem(STORAGE_KEY)
                  hasActiveOrganization = false
                } else {
                  hasActiveOrganization = true
                }
              }
            } catch (parseError) {
            }
          }
        } catch (storageError) {
        }
        
        if (!hasActiveOrganization) {
          return safeNext({ name: 'CRMRemasteredWelcome' })
        }
      } else {
        return safeNext({ name: 'CRMRemasteredWelcome' })
      }
    }

    // 2) проверка прав доступа (модули + ADP URL-политики)
    const accessResult = await checkRouteAccess(to)
    if (!accessResult.allowed) {
      return accessResult.redirect ? safeNext({ name: accessResult.redirect }) : next()
    }

    // 3) requiresOrganization для страниц настроек организации
    if (to.meta && to.meta.requiresOrganization) {
      // Сначала проверяем наличие активной организации в localStorage
      let hasActiveOrganization = false
      
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const STORAGE_KEY = 'crm_active_organization'
          const currentUserId = Cookies.get('userId')
          const currentUserIdNum = currentUserId ? parseInt(currentUserId, 10) : null
          
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            try {
              const data = JSON.parse(stored)
              
              let org = null
              let orgUserId = null
              
              if (data.organization) {
                org = data.organization
                orgUserId = data.user_id || null
              } else {
                org = data
                orgUserId = null
              }
              
              if (org && (org.id || org.name)) {
                if (currentUserIdNum && orgUserId && orgUserId !== currentUserIdNum) {
                  localStorage.removeItem(STORAGE_KEY)
                  hasActiveOrganization = false
                } else {
                  hasActiveOrganization = true
                }
              }
            } catch (parseError) {
              // Игнорируем ошибки парсинга
            }
          }
        } catch (storageError) {
          // Игнорируем ошибки доступа к localStorage
        }
      }
      
      // Если нет активной организации - перенаправляем на Welcome
      if (!hasActiveOrganization) {
        return safeNext({ name: 'CRMRemasteredWelcome' })
      }
      
      // Дополнительно проверяем наличие организаций у пользователя
      // Используем легковесный endpoint check для проверки наличия без загрузки полных данных
      try {
        const { apiClient } = await import('./api/manager')
        const resp = await apiClient.get('/organizations/check/')
        
        if (resp.success && resp.data && resp.data.exists) {
          // У пользователя есть организации - продолжаем навигацию
          return safeNext()
        } else {
          // Если у пользователя нет организаций - перенаправляем на страницу создания в CRM
          return safeNext({ name: 'CRMRemasteredWelcome' })
        }
      } catch (error) {
        // При ошибке также перенаправляем на страницу создания
        return safeNext({ name: 'CRMRemasteredWelcome' })
      }
    }

    return safeNext()
  } catch (err) {
    // При ошибке также очищаем токены
    import('./api/manager').then(({ apiClient }) => {
      apiClient.logout()
    })
    accessDeniedState.active = false
    next({ name: 'StartPage' })
  }
})

export default router;