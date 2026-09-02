/**
 * КОНФИГУРАЦИЯ МАРШРУТИЗАЦИИ ПРИЛОЖЕНИЯ ERGO MS
 */

import { createRouter, createWebHistory, START_LOCATION } from 'vue-router'
import { checkToken } from '@/core/cms/adp/js/auth-index'
import { generateAllRoutes, validateAll, getPermissionRules, getRouteGuards, coreRoutesManager } from '@/modules/index.js'
import { authRoutes as configAuthRoutes, coreRoutes as configCoreRoutes } from '@/config/routes.js'
import {
  checkRouteAdpAccess,
  hasAnyModulePermission,
  checkGlobalAdminAccess,
  getPermissionsSnapshot,
} from '@/core/cms/adp/js/accessControl'
import tokenService from '@/core/cms/js/tokenService'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { hasSessionHintCookie, isExpired } from '@/core/cms/js/tokenStorage.js'
import {
  isServerLogoutFinalized,
  performServerLogout,
} from '@/core/cms/js/tokenRefresh.js'
import { showRateLimitNotice } from '@/composables/useRateLimitNotice.js'
import { isAnonymousRoute, routeNeedsAuth, shouldKeepUnverifiedSession } from '@/js/authRoutePolicy.js'
import {
  consumePostLoginReturnPath,
  savePostLoginReturnPath,
} from '@/core/cms/js/postLoginReturn.js'
import { accessDeniedState } from './accessDeniedState'
import { finishRouteProgress, startRouteProgress } from '@/js/routeProgressState.js'
import { runSessionScopeGuard } from '@/js/session/sessionScopeGuard.js'
import { whenSessionReady } from '@/js/bootstrapSession.js'
import { teGlobal, tGlobal } from '@/i18n/index.js'
import { logError } from '@/js/utils/logError.js'
import {
  applyLayoutPageScroll,
  rememberLayoutPageScroll,
  restoreLayoutPageScroll,
} from '@/js/utils/layoutPageScroll.js'
import { isStaleClientError, recoverFromStaleClient } from '@/js/staleClientGuard.js'
import { traceClientBoot } from '@/js/clientBootTrace.js'

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

function resolveInnerGuardOutcome(result, aborted, redirect) {
  if (result === false || aborted) {
    return false
  }
  if (result && result !== true) {
    return result
  }
  return redirect || null
}

/**
 * Вызывает route guards всех модулей по порядку (алфавит по имени модуля).
 * @returns {Promise<object|false|null>} redirect для router, false или null
 */
async function runModuleRouteGuards(to, from) {
  const guards = await getCachedRouteGuards()
  for (let i = 0; i < guards.length; i++) {
    let redirect = null
    let aborted = false
    const result = await guards[i](to, from, (redirectTo) => {
      if (redirectTo === false) {
        aborted = true
        return
      }
      if (typeof redirectTo === 'string' || (redirectTo && typeof redirectTo === 'object')) {
        redirect = redirectTo
      }
    })
    const outcome = resolveInnerGuardOutcome(result, aborted, redirect)
    if (outcome != null) {
      return outcome
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

export async function revalidateCurrentRoute() {
  if (!router) {
    return
  }
  const to = router.currentRoute.value
  if (!to || to.name === 'AccessDenied') {
    return
  }
  const access = await checkRouteAccess(to)
  if (!access.allowed) {
    await router.replace({ name: access.redirect || 'AccessDenied' })
    return
  }
  const moduleOutcome = await runModuleRouteGuards(to, to)
  if (moduleOutcome && moduleOutcome !== true) {
    await router.replace(moduleOutcome)
  }
}

function hasLiveAccessToken() {
  const access = tokenService.getAccess()
  return Boolean(access && !isExpired(access))
}

async function restoreSessionIfHintPresent() {
  if (isServerLogoutFinalized() || hasLiveAccessToken()) {
    return
  }
  if (!hasSessionHintCookie()) {
    return
  }
  try {
    await whenSessionReady()
  } catch {
    /* cookie есть, restore не удался — дальше уйдём на вход */
  }
}

async function runCheckToken() {
  // После logout не доверяем короткому пути userStore: иначе startRoute
  // синхронно снова шлёт на AppHome до завершения clear().
  if (isServerLogoutFinalized()) {
    return false
  }
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

/** Локальный сброс сессии до редиректа — иначе вложенный beforeEach видит старый access. */
function clearSessionLocally() {
  tokenService.clear()
  try {
    useUserStore().finalizeSession()
  } catch {
    /* pinia ещё не готов */
  }
}

function setupRouterGuards(router) {
  router.beforeEach(async (to, from) => {
    if (from !== START_LOCATION && to.path !== from.path) {
      rememberLayoutPageScroll(from.fullPath)
    }

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

      const guardResult = (params) => {
        clearDeniedUnlessAccessDeniedTarget(params)
        return params === undefined ? true : params
      }

      if (to.meta?.startRoute === true) {
        import('@/composables/useAuthSettingsPreload.js').then(({ preloadAuthSettings }) => {
          preloadAuthSettings()
        })
        await restoreSessionIfHintPresent()
        if (!isServerLogoutFinalized()) {
          try {
            const userStore = useUserStore()
            if (userStore.isInitialized && userStore.isAuthenticated) {
              const returnPath = consumePostLoginReturnPath()
              return guardResult(returnPath || { name: 'AppHome' })
            }
          } catch (_) {
            /* pinia ещё не готов */
          }
        }
      }

      if (isAnonymousRoute(to)) {
        return guardResult()
      }

      if (routeNeedsAuth(to) && !hasLiveAccessToken()) {
        await restoreSessionIfHintPresent()
      }

      if (routeNeedsAuth(to) && !hasLiveAccessToken()) {
        savePostLoginReturnPath(to.fullPath)
        return guardResult({ path: '/login' })
      }

      if (routeNeedsAuth(to) && !(await runCheckToken())) {
        // F5 под 429: оставляем маршрут только если access ещё в памяти.
        // Гость без токена всегда идёт на форму входа, не в оболочку «Гость».
        if (shouldKeepUnverifiedSession()) {
          showRateLimitNotice(0)
          return guardResult()
        }
        // Сброс СИНХРОННО до редиректа на Login. logout не await —
        // иначе первый переход (/ → AppHome) не завершается и маска не снимается.
        savePostLoginReturnPath(to.fullPath)
        clearSessionLocally()
        void performServerLogout('router.requiresAuth')
        return guardResult({ path: '/login' })
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
        return false
      }
      if (scopeRedirect) {
        return guardResult(scopeRedirect)
      }

      const moduleRedirect = await runModuleRouteGuards(to, from)
      if (moduleRedirect === false) {
        return false
      }
      if (moduleRedirect) {
        return guardResult(moduleRedirect)
      }

      const accessResult = await checkRouteAccess(to)
      if (!accessResult.allowed) {
        if (accessResult.redirect === 'AccessDenied') {
          // Прямой заход / reload — нужна страница AccessDenied.
          // Иначе оставляем текущий URL и показываем overlay (без ложного
          // ухода на /access-denied при remount / смене режимов UI).
          if (from === START_LOCATION || to.name === 'AccessDenied') {
            return { name: 'AccessDenied' }
          }
          return false
        }
        return accessResult.redirect ? guardResult({ name: accessResult.redirect }) : true
      }

      return guardResult()
    } catch (error) {
      // Ошибка guard/chunk — не auth-logout: иначе 404 устаревшего чанка после
      // client-build превращается в шторм POST /logout/ на /start-page.
      logError('[routers] beforeEach failed', error)
      accessDeniedState.active = false
      if (isStaleClientError(error)) {
        recoverFromStaleClient('router.beforeEach')
        return false
      }
      if (to?.name === 'StartPage' || to?.name === 'Login' || to?.meta?.startRoute === true) {
        return false
      }
      return { path: '/login' }
    }
  })

  router.afterEach((to) => {
    // Всегда гасим полоску: при редиректе guard'а обратно на тот же path
    // (Back на /login → AppHome) to.path === from.path, иначе зависает.
    finishRouteProgress()
    const moduleKey = to.meta?.moduleKey
    if (typeof moduleKey === 'string' && moduleKey) {
      void import('@/modules/core/federatedModules.js')
        .then(({ ensureRemoteStyles }) => ensureRemoteStyles(moduleKey))
        .catch(() => {})
    }
  })

  router.onError((error) => {
    finishRouteProgress()
    if (isStaleClientError(error)) {
      recoverFromStaleClient('router.onError')
      return
    }
    logError('[routers] onError', error)
  })
}

function asRouteList(value) {
  return Array.isArray(value) ? value : []
}

function isCatchAllRoute(route) {
  return typeof route?.path === 'string' && route.path.includes(':pathMatch(.*)')
}

function prependMissingRoutes(routes, extras) {
  const names = new Set(routes.map((route) => route?.name).filter(Boolean))
  const paths = new Set(routes.map((route) => route?.path).filter(Boolean))
  const pendingCatchAll = []
  for (let i = extras.length - 1; i >= 0; i -= 1) {
    const extra = extras[i]
    if (!extra) {
      continue
    }
    if (extra.name && names.has(extra.name)) {
      continue
    }
    if (!extra.name && extra.path && paths.has(extra.path)) {
      continue
    }
    if (isCatchAllRoute(extra)) {
      pendingCatchAll.push(extra)
      continue
    }
    routes.unshift(extra)
    if (extra.name) {
      names.add(extra.name)
    }
    if (extra.path) {
      paths.add(extra.path)
    }
  }
  pendingCatchAll.forEach((extra) => {
    if (extra.name && names.has(extra.name)) {
      return
    }
    if (extra.path && paths.has(extra.path)) {
      return
    }
    routes.push(extra)
    if (extra.name) {
      names.add(extra.name)
    }
    if (extra.path) {
      paths.add(extra.path)
    }
  })
}

/**
 * Создаёт и настраивает Vue Router (без top-level await).
 * @returns {Promise<import('vue-router').Router>}
 */
export async function initRouter() {
  const routes = await generateAllRoutes()
  prependMissingRoutes(routes, [
    ...asRouteList(configCoreRoutes),
    ...asRouteList(configAuthRoutes),
    ...coreRoutesManager.loadAuthRoutes(),
  ])
  if (!routes.some((route) => route.name === 'Login')) {
    logError('[routers] маршрут Login отсутствует в таблице, добавлен запасной /login')
    traceClientBoot('missing-login-route')
    routes.unshift({
      path: '/login',
      name: 'Login',
      component: () => import('@/core/cms/adp/pages/LoginPage.vue'),
      meta: { startRoute: true, requiresAuth: false },
    })
  }

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
        return new Promise((resolve) => {
          requestAnimationFrame(() => {
            restoreLayoutPageScroll(to.fullPath)
            resolve(savedPosition)
          })
        })
      }
      // Фильтры / сортировка / page в query не должны дёргать страницу вверх.
      if (from && to.path === from.path) {
        return false
      }
      applyLayoutPageScroll(0)
      requestAnimationFrame(() => applyLayoutPageScroll(0))
      return { top: 0 }
    },
  })

  setupRouterGuards(routerInstance)
  router = routerInstance
  return routerInstance
}