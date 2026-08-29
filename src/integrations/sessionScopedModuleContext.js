/**
 * Session-scoped маршруты модулей — platform-контракт ModuleBridge.
 *
 * Модули регистрируют контекст без import из других модулей:
 *   bridge.provideMany(SESSION_SCOPED_MODULE_CONTEXT_GROUP, moduleKey, { pathPrefix, homeRoute, ... })
 */

import bridge from '@/integrations/ModuleBridge.js'
import { SESSION_SCOPED_MODULE_CONTEXT_GROUP } from '@/integrations/moduleContracts.js'

export { SESSION_SCOPED_MODULE_CONTEXT_GROUP }

/**
 * @returns {Array<{ pathPrefix: string, homeRoute: string, overviewRoute?: string, entryRouteNames?: string[], excludedPaths?: string[] }>}
 */
export function collectScopedModuleContexts() {
  return Object.values(bridge.all(SESSION_SCOPED_MODULE_CONTEXT_GROUP)).filter(
    (ctx) => ctx && typeof ctx.pathPrefix === 'string',
  )
}

export function findScopedModuleContextByPath(path) {
  if (!path || typeof path !== 'string') {
    return null
  }

  let match = null
  for (const ctx of collectScopedModuleContexts()) {
    if (!path.startsWith(ctx.pathPrefix)) {
      continue
    }
    if (!match || ctx.pathPrefix.length > match.pathPrefix.length) {
      match = ctx
    }
  }
  return match
}

export function getScopedModuleHomeRoute(path, fallback = null) {
  const ctx = findScopedModuleContextByPath(path)
  return ctx?.homeRoute ?? fallback
}

export function getScopedModuleOverviewRoute(path) {
  const ctx = findScopedModuleContextByPath(path)
  return ctx?.overviewRoute ?? null
}

export function collectScopedModuleEntryRouteNames() {
  const names = new Set()
  for (const ctx of collectScopedModuleContexts()) {
    for (const name of ctx.entryRouteNames || []) {
      names.add(name)
    }
  }
  return names
}

export function collectScopedModuleExcludedPaths() {
  const paths = new Set()
  for (const ctx of collectScopedModuleContexts()) {
    for (const path of ctx.excludedPaths || []) {
      if (path) {
        paths.add(path)
      }
    }
  }
  return paths
}

export function isScopedModuleEntryRoute(routeName) {
  return collectScopedModuleEntryRouteNames().has(routeName)
}

export function isExcludedScopedModulePath(path, ctx) {
  if (!ctx?.excludedPaths?.length) {
    return false
  }
  return ctx.excludedPaths.some((prefix) => path.startsWith(prefix))
}
