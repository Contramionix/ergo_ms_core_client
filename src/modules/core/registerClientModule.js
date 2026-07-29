/**
 * Регистрация клиентского манифеста модуля во все менеджеры.
 */

import { normalizeClientModuleManifest } from './clientModuleManifest.js'
import { logWarn } from '@/js/utils/logError.js'

/**
 * @param {import('./clientModuleManifest.js').ClientModuleManifest|object} rawManifest
 * @param {object} managers
 * @param {import('../routes/RouteManager.js').RouteManager} managers.routeManager
 * @param {import('../api/EndpointManager.js').EndpointManager} managers.endpointManager
 * @param {import('../permissions/PermissionRulesManager.js').PermissionRulesManager} [managers.permissionRulesManager]
 * @param {import('../permissions/PermissionSectionsManager.js').PermissionSectionsManager} [managers.permissionSectionsManager]
 * @param {import('../routing/RouteGuardsManager.js').RouteGuardsManager} [managers.routeGuardsManager]
 * @param {import('../integrations/IntegrationsManager.js').IntegrationsManager} [managers.integrationsManager]
 * @param {import('../i18n/LocaleManager.js').LocaleManager} [managers.localeManager]
 * @param {import('../themes/ThemeDefaultsManager.js').ThemeDefaultsManager} [managers.themeDefaultsManager]
 * @param {string} [sourcePath]
 */
export async function registerClientModule(rawManifest, managers, sourcePath = 'manifest') {
  const manifest = normalizeClientModuleManifest(rawManifest)
  if (!manifest) {
    logWarn(`[registerClientModule] Невалидный манифест: ${sourcePath}`)
    return null
  }

  const pathTag = `${sourcePath}#${manifest.moduleKey}`

  if (manifest.routes && managers.routeManager?.registerRoutesFromManifest) {
    managers.routeManager.registerRoutesFromManifest(manifest.routes, pathTag, manifest.moduleKey)
  }

  if (manifest.endpoints && managers.endpointManager?.registerEndpointsFromManifest) {
    managers.endpointManager.registerEndpointsFromManifest(manifest.endpoints, pathTag)
  }

  if (manifest.permissionRules && managers.permissionRulesManager?.registerRulesFromManifest) {
    managers.permissionRulesManager.registerRulesFromManifest(manifest.permissionRules, pathTag)
  }

  if (manifest.permissionSections && managers.permissionSectionsManager?.registerSectionsFromManifest) {
    managers.permissionSectionsManager.registerSectionsFromManifest(
      manifest.permissionSections,
      pathTag,
    )
  }

  if (manifest.routeGuard && managers.routeGuardsManager?.registerGuardFromManifest) {
    managers.routeGuardsManager.registerGuardFromManifest(
      manifest.routeGuard,
      manifest.moduleKey,
      pathTag,
    )
  }

  if (manifest.integrations && managers.integrationsManager?.activateIntegrationsFromManifest) {
    await managers.integrationsManager.activateIntegrationsFromManifest(
      manifest.integrations,
      pathTag,
    )
  }

  if (manifest.locales && managers.localeManager?.registerLocalesFromManifest) {
    managers.localeManager.registerLocalesFromManifest(manifest.locales, manifest.moduleKey)
  }

  if (manifest.themeDefaults && managers.themeDefaultsManager?.registerThemeDefaultsFromManifest) {
    managers.themeDefaultsManager.registerThemeDefaultsFromManifest(
      manifest.themeDefaults,
      manifest.moduleKey,
    )
  }

  return manifest
}
