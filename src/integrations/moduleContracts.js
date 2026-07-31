/**
 * Каталог platform-контрактов ModuleBridge на клиенте.
 *
 * Единый re-export имён групп и событий для модулей и ядра.
 */

/** Logout / clearTokens: модули чистят свой legacy browser storage. */
export const CORE_AUTH_CLEAR_LEGACY_STORAGE = 'core.auth.clear_legacy_storage'

export { LAYOUT_PLUGIN_REGISTRY_GROUP } from '@/integrations/layoutPluginRegistry.js'
export { HEADER_USER_MENU_ITEMS_GROUP } from '@/integrations/headerUserMenu.js'
export { APPS_MENU_ITEMS_GROUP } from '@/integrations/appsMenu.js'
export { FLOATING_WIDGETS_GROUP } from '@/integrations/floatingWidgets.js'
export {
  MENU_SCOPE_REQUIRED_ROUTE_PREFIXES_GROUP,
  MENU_REMOVED_ROUTE_NAMES_GROUP,
} from '@/integrations/menuExtensions.js'
export { SESSION_SCOPED_MODULE_CONTEXT_GROUP } from '@/integrations/sessionScopedModuleContext.js'
export {
  SESSION_SCOPE_ENTRY_ROUTES_GROUP,
  getSessionDefaultHomeRoute,
  getSessionScopeWelcomeRoute,
} from '@/integrations/sessionScopeEntryRoutes.js'
