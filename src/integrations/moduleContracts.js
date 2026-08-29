/**
 * Каталог platform-контрактов ModuleBridge на клиенте.
 *
 * Только строковые имена групп и событий. Реализации живут в профильных
 * файлах интеграций: иначе remotes, импортируя константу, тянут сборщик
 * меню, moduleManager и пол-оболочки.
 */

/** Logout / clearTokens: модули чистят свой legacy browser storage. */
export const CORE_AUTH_CLEAR_LEGACY_STORAGE = 'core.auth.clear_legacy_storage'

export const LAYOUT_PLUGIN_REGISTRY_GROUP = 'layout.plugin_registry'
export const HEADER_USER_MENU_ITEMS_GROUP = 'header.userMenu.items'
export const APPS_MENU_ITEMS_GROUP = 'apps.menu.items'
export const FLOATING_WIDGETS_GROUP = 'shell.floating_widgets'
export const SHELL_SIDEBAR_BRAND_GROUP = 'shell.sidebar_brand'
export const MENU_SCOPE_REQUIRED_ROUTE_PREFIXES_GROUP = 'menu.scope_required_route_prefixes'
export const MENU_REMOVED_ROUTE_NAMES_GROUP = 'menu.removed_route_names'
export const SESSION_SCOPED_MODULE_CONTEXT_GROUP = 'session_scope.module_context'
export const SESSION_SCOPE_ENTRY_ROUTES_GROUP = 'session.scope_entry_routes'
