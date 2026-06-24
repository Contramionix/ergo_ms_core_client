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
import { checkRouteAdpAccess, hasAnyModulePermission, checkGlobalAdminAccess } from '@/core/cms/adp/js/accessControl'
import { accessDeniedState } from './accessDeniedState'

let organizationGuard = null
// Опциональная загрузка organizationGuard через Vite glob,
// чтобы npm run build не падал, если модуль organizations не установлен
const organizationGuardModules = import.meta.glob(
  '../../../../modules/organizations/client/js/organizationGuard.js'
)

if (Object.keys(organizationGuardModules).length > 0) {
  try {
    const loadGuardModule =
      organizationGuardModules[Object.keys(organizationGuardModules)[0]]
    const orgGuardModule = await loadGuardModule()
    organizationGuard = orgGuardModule.organizationGuard
  } catch (e) {
    console.debug(
      '[Router] Ошибка загрузки organizationGuard из модуля organizations:',
      e
    )
  }
} else {
  console.debug(
    '[Router] Модуль organizations не установлен, organizationGuard отключен'
  )
}

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

  // 0) Глобальный администратор (настройки сайта, админ-панель)
  if (to.meta?.requiresGlobalAdmin) {
    const isGlobalAdmin = await checkGlobalAdminAccess()
    if (!isGlobalAdmin) {
      accessDeniedState.active = true
      accessDeniedState.title = 'Доступ запрещён'
      accessDeniedState.message = 'Требуются права администратора.'
      return { allowed: false, redirect: 'AccessDenied' }
    }
  }

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

      if (
        Array.isArray(rule.denyIfHasAnyPermission) &&
        rule.denyIfHasAnyPermission.length > 0
      ) {
        const isDenied = await hasAnyModulePermission(
          rule.module,
          rule.denyIfHasAnyPermission,
        )
        if (isDenied) {
          accessDeniedState.active = true
          accessDeniedState.title = rule.denyTitle || rule.title
          accessDeniedState.message = rule.denyMessage || rule.message
          return { allowed: false, redirect: 'AccessDenied' }
        }
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
await validateAll()

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

    if (to.meta?.startRoute === true && (await runCheckToken())) {
      return safeNext({ name: 'Account' })
    }

    // 1) нужна авторизация?
    if (to.meta.requiresAuth && !(await runCheckToken())) {
      // Очищаем токены при неудачной проверке
      import('./api/manager').then(({ apiClient }) => {
        apiClient.logout()
      })
      return safeNext({ name: 'StartPage' })
    }

    // 2) Проверка авторизации в организацию (JWT-based)
    // organizationGuard проверяет наличие organization_id в JWT токене
    // Пропускаем если модуль organizations не установлен
    if (organizationGuard) {
      let organizationRedirect = null
      await organizationGuard(to, from, (redirectTo) => {
        if (redirectTo && typeof redirectTo === 'object') {
          organizationRedirect = redirectTo
        }
      })
      
      if (organizationRedirect) {
        return safeNext(organizationRedirect)
      }
    }

    // 3) Проверка прав доступа (модули + ADP URL-политики)
    const accessResult = await checkRouteAccess(to)
    if (!accessResult.allowed) {
      return accessResult.redirect ? safeNext({ name: accessResult.redirect }) : next()
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