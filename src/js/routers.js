/**
 * КОНФИГУРАЦИЯ МАРШРУТИЗАЦИИ ПРИЛОЖЕНИЯ ERGO MS
 */

import { createRouter, createWebHistory } from 'vue-router'
import { checkToken } from '@/core/cms/adp/js/auth-index'
import { generateAllRoutes, validateAll, getPermissionRules } from '@/modules/index.js'
import { checkRouteAdpAccess, hasAnyModulePermission, checkGlobalAdminAccess } from '@/core/cms/adp/js/accessControl'
import tokenService from '@/core/cms/js/tokenService'
import { accessDeniedState } from './accessDeniedState'

const organizationGuardModules = import.meta.glob(
  '../../../../modules/organizations/client/js/organizationGuard.js',
)

let cachedPermissionRules = null
let organizationGuard = null
let organizationGuardPromise = null

/** @type {import('vue-router').Router|null} */
export let router = null

async function resolveOrganizationGuard() {
  if (organizationGuard !== null) {
    return organizationGuard
  }
  if (!organizationGuardPromise) {
    organizationGuardPromise = loadOrganizationGuard()
  }
  organizationGuard = await organizationGuardPromise
  return organizationGuard
}

async function loadOrganizationGuard() {
  if (Object.keys(organizationGuardModules).length === 0) {
    console.debug(
      '[Router] Модуль organizations не установлен, organizationGuard отключен',
    )
    return null
  }

  try {
    const loadGuardModule =
      organizationGuardModules[Object.keys(organizationGuardModules)[0]]
    const orgGuardModule = await loadGuardModule()
    return orgGuardModule.organizationGuard
  } catch (e) {
    console.debug(
      '[Router] Ошибка загрузки organizationGuard из модуля organizations:',
      e,
    )
    return null
  }
}

async function getCachedPermissionRules() {
  if (cachedPermissionRules === null) {
    cachedPermissionRules = await getPermissionRules()
  }
  return cachedPermissionRules
}

async function checkRouteAccess(to) {
  const MODULE_PERMISSION_RULES = await getCachedPermissionRules()

  if (to.meta?.requiresGlobalAdmin) {
    const isGlobalAdmin = await checkGlobalAdminAccess()
    if (!isGlobalAdmin) {
      accessDeniedState.active = true
      accessDeniedState.title = 'Доступ запрещён'
      accessDeniedState.message = 'Требуются права администратора.'
      return { allowed: false, redirect: 'AccessDenied' }
    }
  }

  for (let i = 0; i < MODULE_PERMISSION_RULES.length; i++) {
    const rule = MODULE_PERMISSION_RULES[i]
    const ruleMatches = rule.match(to)

    if (ruleMatches) {
      if (rule.skipWithoutOrganization && !tokenService.getOrganizationId()) {
        continue
      }

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
    }
  }

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

async function runCheckToken() {
  return checkToken()
}

function setupRouterGuards(router) {
  router.beforeEach(async (to, from, next) => {
    try {
      const safeNext = (params) => {
        accessDeniedState.active = false
        return next(params)
      }

      if (to.meta?.startRoute === true && (await runCheckToken())) {
        return safeNext({ name: 'Account' })
      }

      if (to.meta.requiresAuth && !(await runCheckToken())) {
        import('./api/manager').then(({ apiClient }) => {
          apiClient.logout()
        })
        return safeNext({ name: 'StartPage' })
      }

      const guard = await resolveOrganizationGuard()
      if (guard) {
        let organizationRedirect = null
        await guard(to, from, (redirectTo) => {
          if (redirectTo && typeof redirectTo === 'object') {
            organizationRedirect = redirectTo
          }
        })

        if (organizationRedirect) {
          return safeNext(organizationRedirect)
        }
      }

      const accessResult = await checkRouteAccess(to)
      if (!accessResult.allowed) {
        return accessResult.redirect ? safeNext({ name: accessResult.redirect }) : next()
      }

      return safeNext()
    } catch {
      import('./api/manager').then(({ apiClient }) => {
        apiClient.logout()
      })
      accessDeniedState.active = false
      next({ name: 'StartPage' })
    }
  })
}

/**
 * Создаёт и настраивает Vue Router (без top-level await).
 * @returns {Promise<import('vue-router').Router>}
 */
export async function initRouter() {
  const routes = await generateAllRoutes()

  void validateAll()

  routes.forEach((route) => {
    if (!route.meta || !Object.prototype.hasOwnProperty.call(route.meta, 'startRoute')) {
      route.meta = route.meta || {}
      route.meta.startRoute = false
    }
  })

  const routerInstance = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior() {
      return { top: 0 }
    },
  })

  setupRouterGuards(routerInstance)
  router = routerInstance
  return routerInstance
}