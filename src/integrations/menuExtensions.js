/**
 * Расширения фильтрации меню — регистрация через ModuleBridge (без имён модулей в ядре).
 */

import bridge from '@/integrations/ModuleBridge.js'
import {
  MENU_REMOVED_ROUTE_NAMES_GROUP,
  MENU_SCOPE_REQUIRED_ROUTE_PREFIXES_GROUP,
} from '@/integrations/moduleContracts.js'

export { MENU_REMOVED_ROUTE_NAMES_GROUP, MENU_SCOPE_REQUIRED_ROUTE_PREFIXES_GROUP }

export function collectRemovedMenuRouteNames() {
  return new Set(
    Object.values(bridge.all(MENU_REMOVED_ROUTE_NAMES_GROUP)).filter(
      (name) => typeof name === 'string' && name.length > 0,
    ),
  )
}

export function isScopeRequiredMenuRoutePrefix(routeName) {
  if (!routeName || typeof routeName !== 'string') {
    return false
  }

  const prefixes = Object.values(bridge.all(MENU_SCOPE_REQUIRED_ROUTE_PREFIXES_GROUP)).filter(
    (prefix) => typeof prefix === 'string' && prefix.length > 0,
  )

  return prefixes.some((prefix) => routeName.startsWith(prefix))
}
