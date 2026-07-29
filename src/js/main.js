import '@/js/utils/logger.js'

import 'vue-toastification/dist/index.css'
import '@/scss/styles.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { initUiPreferences } from '@/js/uiPreferences.js'
import { bootLocalesPromise, i18n } from '@/i18n/index.js'

// initTheme — в color-theme.js (head), до main.
initUiPreferences()

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
 * Без top-level await / без sync logError: иначе на Vite dev + Slow 3G
 * client_monitor/api занимают HTTP/1.1 слоты раньше App (см. localhost.har).
 *
 * 0) boot-locale-prefetch.js в head
 * 1) bootLocalesPromise
 * 2) App/toast/uiSettings → module locales → endpoints+router → mount
 * 3) session / monitor / themes — idle
 */
bootLocalesPromise
  .then(() =>
    Promise.all([
      import('@/App.vue'),
      import('vue-toastification'),
      import('@/js/utils/toast.js'),
      import('@/js/utils/autoAnimatePlugin.js'),
      import('@/js/siteWordmark.js'),
      import('@/core/cms/js/uiSettings.js'),
      import('@/js/bootstrapMask.js'),
    ]),
  )
  .then(
    ([
      appModule,
      toastModule,
      toastUtils,
      autoAnimateModule,
      wordmarkModule,
    ]) => {
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

      return app
    },
  )
  .then((app) =>
    import('@/modules/i18n/LocaleManager.js')
      .then(({ preloadModuleLocales }) => preloadModuleLocales())
      .catch(() => {})
      .then(() => app),
  )
  .then((app) =>
    Promise.all([
      import('@/js/api/endpoints.js').then((m) => m.initEndpoints()),
      import('@/js/routers.js').then((m) => m.initRouter()),
    ]).then(([, router]) => ({ app, router })),
  )
  .then(({ app, router }) => {
    app.use(router)
    app.mount('#app')

    void import('@/js/bootstrapSession.js').then(({ bootstrapAppSession }) => {
      void bootstrapAppSession()
    })

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
  })
  .catch((error) => {
    void import('@/js/bootFailure.js').then(({ showBootFailure }) => showBootFailure(error))
  })
