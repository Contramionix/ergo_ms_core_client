import '@/js/utils/logger.js'

import 'vue-toastification/dist/index.css'
import '@/scss/styles.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import { hideBootstrapMask } from '@/js/bootstrapMask.js'
import { initUiPreferences } from '@/js/uiPreferences.js'
import { bootLocalesPromise, i18n, tGlobal } from '@/i18n/index.js'

// initTheme — в color-theme.js (head), до main; здесь не тянем theme-manager повторно.
initUiPreferences()

function showBootFailure(error) {
  hideBootstrapMask()
  void import('@/js/utils/logError.js')
    .then(({ logError }) => logError(tGlobal('errors.boot.failedLog'), error))
    .catch(() => {})
  if (typeof document !== 'undefined') {
    const root = document.getElementById('app')
    if (root) {
      root.textContent = tGlobal('errors.boot.failed')
    }
  }
}

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
 * Без top-level await: иначе evaluation чанка index не завершается, пока
 * initEndpoints/initRouter ждут dynamic import integrations/routes, а те
 * статически импортируют index → ESM-дедлок (сеть 200, SPA навсегда в boot-loader).
 *
 * Фазы (Vite dev + Slow 3G / HTTP/1.1):
 * 0) boot-locale-prefetch.js в head — прогрев locales/* до очереди main
 * 1) bootLocalesPromise (i18n) — без sync logError/client_monitor/api
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
  .catch(showBootFailure)
