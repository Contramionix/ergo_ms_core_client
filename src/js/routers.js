/**
 * КОНФИГУРАЦИЯ МАРШРУТИЗАЦИИ ПРИЛОЖЕНИЯ ERGO MS
 */

import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import { checkToken } from '@/core/cms/adp/js/auth-index'
import { generateAllRoutes, validateAll, getPermissionRules, getRouteGuards } from '@/modules/index.js'
import {
  checkRouteAdpAccess,
  hasAnyModulePermission,
  checkGlobalAdminAccess,
  getPermissionsSnapshot,
} from '@/core/cms/adp/js/accessControl'
import tokenService from '@/core/cms/js/tokenService'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { isExpired } from '@/core/cms/js/tokenStorage.js'
import { accessDeniedState } from './accessDeniedState'
import { finishRouteProgress, startRouteProgress } from '@/js/routeProgressState.js'
import { runSessionScopeGuard } from '@/js/session/sessionScopeGuard.js'
import { whenSessionReady } from '@/js/sessionReady.js'
import { teGlobal, tGlobal } from '@/i18n/index.js'
import { logError } from '@/js/utils/logError.js'

let cachedPermissionRules = null
let cachedRouteGuards = null

/**
 * Подпись из permission-rules: ключ i18n (titleKey/messageKey) или литерал title/message.
 * @param {string|undefined} key
 * @param {string|undefined} fallback
 * @returns {string}
 */
function resolvePermissionRuleText(key, fallback = '') {
  if (typeof key === 'string' && key && teGlobal(key)) {
    return tGlobal(key)
  }
  return typeof fallback === 'string' ? fallback : ''
}

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
    let aborted = false
    await guards[i](to, from, (redirectTo) => {
      if (redirectTo === false) {
        aborted = true
        return
      }
      if (typeof redirectTo === 'string' || (redirectTo && typeof redirectTo === 'object')) {
        redirect = redirectTo
      }
    })
    if (aborted) {
      return false
    }
    if (redirect) {
      return redirect
    }
  }
  return null
}

/**
 * Platform session-scope: meta.requiresSessionScope / requiresActiveSessionScope.
 * Welcome/home — из bridge (session.scope_entry_routes).
 * @returns {Promise<object|false|null>}
 */
async function runPlatformSessionScopeGuard(to, from) {
  let redirect = null
  let aborted = false
  await runSessionScopeGuard(to, from, (redirectTo) => {
    if (redirectTo === false) {
      aborted = true
      return
    }
    if (typeof redirectTo === 'string' || (redirectTo && typeof redirectTo === 'object')) {
      redirect = redirectTo
    }
  })
  if (aborted) {
    return false
  }
  return redirect
}

async function getCachedPermissionRules() {
  if (cachedPermissionRules === null) {
    cachedPermissionRules = await getPermissionRules()
  }
  return cachedPermissionRules
}

async function checkRouteAccess(to) {
  const hasAccessToken = Boolean(tokenService.getAccess())

  if (!hasAccessToken && !to.meta?.requiresAuth && !to.meta?.requiresGlobalAdmin) {
    accessDeniedState.active = false
    return { allowed: true }
  }

  const MODULE_PERMISSION_RULES = await getCachedPermissionRules()
  const permissionsSnapshot = await getPermissionsSnapshot()
  const isGlobalAdmin = Boolean(permissionsSnapshot?.is_global_admin)

  if (to.meta?.requiresGlobalAdmin) {
    const canAccessAdminPanel = await checkGlobalAdminAccess()
    if (!canAccessAdminPanel) {
      accessDeniedState.active = true
      accessDeniedState.title = tGlobal('admin.access.deniedTitle')
      accessDeniedState.message = tGlobal('admin.access.adminRequired')
      return { allowed: false, redirect: 'AccessDenied' }
    }
  }

  if (!isGlobalAdmin) {
    for (let i = 0; i < MODULE_PERMISSION_RULES.length; i++) {
      const rule = MODULE_PERMISSION_RULES[i]
      const ruleMatches = rule.match(to)

      if (ruleMatches) {
        if (rule.skipWithoutSessionScope && !tokenService.hasActiveSessionScope()) {
          continue
        }

        const hasAccess = await hasAnyModulePermission(rule.module, rule.permissions)

        if (!hasAccess) {
          accessDeniedState.active = true
          accessDeniedState.title = resolvePermissionRuleText(rule.titleKey, rule.title)
          accessDeniedState.message = resolvePermissionRuleText(rule.messageKey, rule.message)
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
            accessDeniedState.title = resolvePermissionRuleText(
              rule.denyTitleKey || rule.titleKey,
              rule.denyTitle || rule.title,
            )
            accessDeniedState.message = resolvePermissionRuleText(
              rule.denyMessageKey || rule.messageKey,
              rule.denyMessage || rule.message,
            )
            return { allowed: false, redirect: 'AccessDenied' }
          }
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
    const sameCacheGroup =
      from.meta?.cacheGroup &&
      to.meta?.cacheGroup &&
      from.meta.cacheGroup === to.meta.cacheGroup

    if (from !== START_LOCATION && to.path !== from.path && !sameCacheGroup) {
      startRouteProgress()
    }

    try {
      const clearDeniedUnlessAccessDeniedTarget = (params) => {
        const toName = params && typeof params === 'object' ? params.name : null
        if (toName !== 'AccessDenied') {
          accessDeniedState.active = false
        }
      }

      const safeNext = (params) => {
        clearDeniedUnlessAccessDeniedTarget(params)
        return next(params)
      }

      if (to.meta?.startRoute === true) {
        // Раньше LayoutStart/LoginPage: к моменту отрисовки настройки уже в памяти.
        import('@/composables/useAuthSettingsPreload.js').then(({ preloadAuthSettings }) => {
          preloadAuthSettings()
        })
      }

      if (to.meta?.startRoute === true && (await runCheckToken())) {
        return safeNext({ name: 'AppHome' })
      }

      if (to.meta.requiresAuth && !(await runCheckToken())) {
        // Локальный сброс + один серверный logout (дедуп в tokenRefresh).
        // Не auth.logout() с location.href — иначе цикл со startRoute → AppHome.
        import('@/core/cms/js/tokenRefresh.js').then(({ performServerLogout }) => {
          performServerLogout()
        })
        import('@/core/cms/js/tokenService').then(({ tokenService }) => {
          tokenService.clear()
        })
        return safeNext({ name: 'StartPage' })
      }

      // F5 / прямой заход: session-bootstrap ещё может не успеть — без него
      // requiresGlobalAdmin и ADP дают ложный AccessDenied.
      if (from === START_LOCATION && (to.meta?.requiresAuth || to.meta?.requiresGlobalAdmin)) {
        try {
          await whenSessionReady()
        } catch {
          /* гость / bootstrap недоступен — дальше отработают проверки доступа */
        }
      }

      const scopeRedirect = await runPlatformSessionScopeGuard(to, from)
      if (scopeRedirect === false) {
        return next(false)
      }
      if (scopeRedirect) {
        return safeNext(scopeRedirect)
      }

      const moduleRedirect = await runModuleRouteGuards(to, from)
      if (moduleRedirect === false) {
        return next(false)
      }
      if (moduleRedirect) {
        return safeNext(moduleRedirect)
      }

      const accessResult = await checkRouteAccess(to)
      if (!accessResult.allowed) {
        if (accessResult.redirect === 'AccessDenied') {
          // Прямой заход / reload — нужна страница AccessDenied.
          // Иначе оставляем текущий URL и показываем overlay (без ложного
          // ухода на /access-denied при remount / смене режимов UI).
          if (from === START_LOCATION || to.name === 'AccessDenied') {
            return next({ name: 'AccessDenied' })
          }
          return next(false)
        }
        return accessResult.redirect ? safeNext({ name: accessResult.redirect }) : next()
      }

      return safeNext()
    } catch (error) {
      logError('[routers] beforeEach failed; clearing session', error)
      import('@/core/cms/js/tokenRefresh.js').then(({ performServerLogout }) => {
        performServerLogout()
      })
      import('@/core/cms/js/tokenService').then(({ tokenService }) => {
        tokenService.clear()
      })
      accessDeniedState.active = false
      next({ name: 'StartPage' })
    }
  })

  router.afterEach(() => {
    // Всегда гасим полоску: при редиректе guard'а обратно на тот же path
    // (Back на /login → AppHome) to.path === from.path, иначе зависает.
    finishRouteProgress()
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

  if (import.meta.env.DEV) {
    void validateAll()
  }

  routes.forEach((route) => {
    if (!route.meta || !Object.prototype.hasOwnProperty.call(route.meta, 'startRoute')) {
      route.meta = route.meta || {}
      route.meta.startRoute = false
    }
  })

  const routerInstance = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) {
        return savedPosition
      }
      // Фильтры / сортировка / page в query не должны дёргать страницу вверх.
      if (from && to.path === from.path) {
        return false
      }
      return { top: 0 }
    },
  })

  setupRouterGuards(routerInstance)
  router = routerInstance
  return routerInstance
}