/**
 * Публичный API shell для standalone SPA-репозиториев модулей.
 *
 *   import { bootstrapErgoClient } from '@ergo-ms/client-shell'
 *   await bootstrapErgoClient({
 *     modules: [() => import('./module/manifest.js')],
 *     clientEnv: { }, // optional overrides
 *   })
 */

import '@/js/utils/logger.js'
import 'vue-toastification/dist/index.css'
import '@/scss/styles.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { initUiPreferences } from '@/js/uiPreferences.js'
import { bootLocalesPromise, i18n } from '@/i18n/index.js'
import { normalizeClientModuleManifest } from '@/modules/core/clientModuleManifest.js'

/**
 * @typedef {object} BootstrapErgoClientOptions
 * @property {Array<(() => Promise<unknown>)|object>} [modules] — манифесты или loaders
 * @property {Record<string, string|boolean|number>} [clientEnv] — перекрытия (документация)
 * @property {HTMLElement|string} [mount] — селектор или элемент (#app)
 */

/**
 * @param {BootstrapErgoClientOptions} [options]
 * @returns {Promise<{ app: import('vue').App, router: import('vue-router').Router }>}
 */
export async function bootstrapErgoClient(options = {}) {
  initUiPreferences()

  await bootLocalesPromise

  const [
    appModule,
    toastModule,
    toastUtils,
    autoAnimateModule,
    wordmarkModule,
  ] = await Promise.all([
    import('@/App.vue'),
    import('vue-toastification'),
    import('@/js/utils/toast.js'),
    import('@/js/utils/autoAnimatePlugin.js'),
    import('@/js/siteWordmark.js'),
    import('@/core/cms/js/uiSettings.js'),
    import('@/js/bootstrapMask.js'),
  ])

  const app = createApp(appModule.default)
  const pinia = createPinia()

  app.use(pinia)
  app.use(i18n)
  app.use(autoAnimateModule.gatedAutoAnimatePlugin)
  app.use(toastModule.default, toastUtils.getToastPluginOptions())
  toastUtils.syncToastPluginWithSettings()

  if (typeof document !== 'undefined') {
    document.title = wordmarkModule.DEFAULT_SITE_NAME
  }

  const { moduleManager } = await import('@/modules/index.js')

  const loaders = Array.isArray(options.modules) ? options.modules : []
  for (const item of loaders) {
    const raw = typeof item === 'function' ? await item() : item
    const payload = raw?.default && typeof raw.default === 'object' ? raw.default : raw
    const manifest = normalizeClientModuleManifest(payload)
    if (manifest) {
      await moduleManager.registerModule(manifest, `standalone:${manifest.moduleKey}`)
    }
  }

  await import('@/modules/i18n/LocaleManager.js')
    .then(({ preloadModuleLocales }) => preloadModuleLocales())
    .catch(() => {})

  const [, router] = await Promise.all([
    import('@/js/api/endpoints.js').then((m) => m.initEndpoints()),
    import('@/js/routers.js').then((m) => m.initRouter()),
  ])

  app.use(router)

  const mountTarget = options.mount || '#app'
  app.mount(mountTarget)

  void import('@/js/bootstrapSession.js').then(({ bootstrapAppSession }) => {
    void bootstrapAppSession()
  })

  return { app, router }
}

export { normalizeClientModuleManifest } from '@/modules/core/clientModuleManifest.js'
export { registerClientModule } from '@/modules/core/registerClientModule.js'
