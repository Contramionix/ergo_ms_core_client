import { initRouter } from '@/js/routers.js'

import '@/js/utils/logger.js'

import 'vue-toastification/dist/index.css'
import '@/scss/styles.scss'

import Toast from 'vue-toastification'
import { getToastPluginOptions, syncToastPluginWithSettings } from '@/js/utils/toast.js'
import { gatedAutoAnimatePlugin } from '@/js/utils/autoAnimatePlugin.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { initEndpoints } from '@/js/api/endpoints.js'
import { hideBootstrapMask } from '@/js/bootstrapMask.js'
import { DEFAULT_SITE_NAME } from '@/js/siteWordmark.js'
import { bootstrapAppSession } from '@/js/bootstrapSession.js'
import { initTheme } from '@/js/theme-manager.js'
import { initUiPreferences } from '@/js/uiPreferences.js'
import { logError } from '@/js/utils/logError.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(gatedAutoAnimatePlugin)
app.use(Toast, getToastPluginOptions())
syncToastPluginWithSettings()

if (typeof document !== 'undefined') {
  document.title = DEFAULT_SITE_NAME
}

initTheme()
initUiPreferences()

function showBootFailure(error) {
  hideBootstrapMask()
  logError('Не удалось запустить клиент:', error)
  if (typeof document !== 'undefined') {
    const root = document.getElementById('app')
    if (root) {
      root.textContent =
        'Не удалось загрузить приложение. Обновите страницу или проверьте, что API запущен.'
    }
  }
}

/**
 * Без top-level await: иначе evaluation чанка index не завершается, пока
 * initEndpoints/initRouter ждут dynamic import integrations/routes, а те
 * статически импортируют index → ESM-дедлок (сеть 200, SPA навсегда в boot-loader).
 */
Promise.all([initEndpoints(), initRouter()])
  .then(([, router]) => {
    app.use(router)
    app.mount('#app')

    // warmupAvatar — после applySessionBootstrapData (на F5 avatarUrl ещё null)
    void bootstrapAppSession()

    void import('@/js/theme-service.js')
      .then(({ syncSiteThemeFromApi }) => syncSiteThemeFromApi())
      .catch(() => {})

    void import('@/modules/themes/ThemeDefaultsManager.js')
      .then(({ preloadModuleThemeManifests }) => preloadModuleThemeManifests())
      .catch(() => {})
  })
  .catch(showBootFailure)
