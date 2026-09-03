import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { bootLocalesPromise, i18n } from '@/i18n/index.js'
import { clientEnv } from '@/js/clientEnv.js'

/**
 * Откладывает некритичную работу после первого paint (не конкурирует с layout/session на 3G).
 * @param {() => void} fn
 */
function runWhenIdle(fn) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => fn(), { timeout: 4000 })
    return
  }
  setTimeout(fn, 1)
}

/**
 * @typedef {object} RunClientBootOptions
 * @property {HTMLElement|string} [mount='#app']
 * @property {boolean} [enableIdlePostBoot=false]
 * @property {(ctx: { app: import('vue').App, pinia: import('pinia').Pinia, i18n: typeof i18n }) => Promise<void>|void} [beforeMount]
 */

/**
 * Общие шаги boot клиента (main.js и bootstrapErgoClient.js).
 * initUiPreferences вызывает caller до runClientBoot при необходимости.
 *
 * @param {RunClientBootOptions} [options]
 * @returns {Promise<{ app: import('vue').App, router: import('vue-router').Router }>}
 */
export async function runClientBoot(options = {}) {
  const {
    mount = '#app',
    enableIdlePostBoot = false,
    beforeMount,
  } = options

  await bootLocalesPromise

  const [
    appModule,
    autoAnimateModule,
    cspStyleModule,
    wordmarkModule,
  ] = await Promise.all([
    import('@/App.vue'),
    import('@/js/utils/autoAnimatePlugin.js'),
    import('@/js/cspInlineStyle.js'),
    import('@/js/siteWordmark.js'),
    import('@/core/cms/js/uiSettings.js'),
    import('@/js/bootstrapMask.js'),
  ])

  const app = createApp(appModule.default)
  const pinia = createPinia()

  app.use(pinia)
  app.use(i18n)
  app.use(autoAnimateModule.gatedAutoAnimatePlugin)
  app.use(cspStyleModule.cspStyleDirectivePlugin)

  if (typeof document !== 'undefined') {
    document.title = wordmarkModule.DEFAULT_SITE_NAME
  }

  const ctx = { app, pinia, i18n }

  if (beforeMount) {
    await beforeMount(ctx)
  }

  // Каталоги модулей дорисуются после оболочки — не держим mount.
  void import('@/modules/i18n/LocaleManager.js')
    .then(({ preloadModuleLocales }) => preloadModuleLocales())
    .catch(() => {})

  const [
    { bootstrapAppSession },
    { initEndpoints },
    routersModule,
  ] = await Promise.all([
    import('@/js/bootstrapSession.js'),
    import('@/js/api/endpoints.js'),
    import('@/js/routers.js'),
  ])

  await initEndpoints()
  void bootstrapAppSession()
  const router = await routersModule.initRouter()
  app.use(router)

  const { installStaleClientGuards } = await import('@/js/staleClientGuard.js')
  installStaleClientGuards({ app, router })

  app.mount(mount)

  if (enableIdlePostBoot) {
    runWhenIdle(() => {
      if (clientEnv.monitoringEnabled) {
        void import('@/core/client_monitor/loadCollector.js')
          .then(({ loadCollector }) => loadCollector())
          .then(({ initClientMonitor }) => {
            void import('@/js/api/manager.js').then(({ apiClient }) => {
              initClientMonitor({ app, router, axiosInstance: apiClient.client })
            })
          })
          .catch(() => {})
      }

      void import('@/js/theme-service.js')
        .then(({ syncSiteThemeFromApi }) => syncSiteThemeFromApi())
        .catch(() => {})

      void import('@/modules/themes/ThemeDefaultsManager.js')
        .then(({ preloadModuleThemeManifests }) => preloadModuleThemeManifests())
        .catch(() => {})
    })
  }

  return { app, router }
}
