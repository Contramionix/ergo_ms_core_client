/**
 * КОНФИГУРАЦИЯ МАРШРУТИЗАЦИИ ПРИЛОЖЕНИЯ ERGO MS
 */

import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import { checkToken } from '@/core/cms/adp/js/auth-index'
import { generateAllRoutes, validateAll, getPermissionRules, getRouteGuards } from '@/modules/index.js'
import { checkRouteAdpAccess, hasAnyModulePermission, checkGlobalAdminAccess } from '@/core/cms/adp/js/accessControl'
import tokenService from '@/core/cms/js/tokenService'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { isExpired } from '@/core/cms/js/tokenStorage.js'
import { accessDeniedState } from './accessDeniedState'
import { finishRouteProgress, startRouteProgress } from '@/js/routeProgressState.js'

let cachedPermissionRules = null
let cachedRouteGuards = null

/** @type {import('vue-router').Router|null} */
export let router = null

async function getCachedRouteGuards() {
  if (cachedRouteGuards === null) {
    cachedRouteGuards = await getRouteGuards()
  }
  return cachedRouteGuards
}

/**
 * Вызывает route guards всех модулей по порядку (алфавит по имени модуля).
 * @returns {Promise<object|null>} redirect для router или null
 */
async function runModuleRouteGuards(to, from) {
  const guards = await getCachedRouteGuards()
  for (let i = 0; i < guards.length; i++) {
    let redirect = null
    await guards[i](to, from, (redirectTo) => {
      if (redirectTo && typeof redirectTo === 'object') {
        redirect = redirectTo
      }
    })
    if (redirect) {
      return redirect
    }
  }
  return null
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
  const access = tokenService.getAccess()
  if (access && !isExpired(access)) {
    try {
      const userStore = useUserStore()
      if (userStore.isInitialized && userStore.isAuthenticated) {
        return true
      }
    } catch (_) {
      /* pinia ещё не готов */
    }
  }
  return checkToken()
}

function setupRouterGuards(router) {
  router.beforeEach(async (to, from, next) => {
    if (from !== START_LOCATION && to.path !== from.path) {
      startRouteProgress()
    }

    try {
      const safeNext = (params) => {
        accessDeniedState.active = false
        return next(params)
      }

      if (to.meta?.startRoute === true && (await runCheckToken())) {
        return safeNext({ name: 'AppHome' })
      }

      if (to.meta.requiresAuth && !(await runCheckToken())) {
        import('./api/manager').then(({ apiClient }) => {
          apiClient.logout()
        })
        return safeNext({ name: 'StartPage' })
      }

      const moduleRedirect = await runModuleRouteGuards(to, from)
      if (moduleRedirect) {
        return safeNext(moduleRedirect)
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

  router.afterEach((to, from) => {
    if (from !== START_LOCATION && to.path !== from.path) {
      finishRouteProgress()
    }
  })

  router.onError(() => {
    finishRouteProgress()
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