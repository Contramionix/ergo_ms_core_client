import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { bootLocalesPromise, i18n } from '@/i18n/index.js'

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

  const ctx = { app, pinia, i18n }

  if (beforeMount) {
    await beforeMount(ctx)
  }

  await import('@/modules/i18n/LocaleManager.js')
    .then(({ preloadModuleLocales }) => preloadModuleLocales())
    .catch(() => {})

  const [, router] = await Promise.all([
    import('@/js/api/endpoints.js').then((m) => m.initEndpoints()),
    import('@/js/routers.js').then((m) => m.initRouter()),
  ])

  app.use(router)
  app.mount(mount)

  void import('@/js/bootstrapSession.js').then(({ bootstrapAppSession }) => {
    void bootstrapAppSession()
  })

  if (enableIdlePostBoot) {
    runWhenIdle(() => {
      void import('@/core/client_monitor/index.js')
        .then(({ initClientMonitor }) => {
          void import('@/js/api/manager.js').then(({ apiClient }) => {
            initClientMonitor({ app, router, axiosInstance: apiClient.client })
          })
        })
        .catch(() => {})

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
