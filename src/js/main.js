import { initRouter } from '@/js/routers.js'
import { authGuard } from '@/core/cms/js/authGuard.js'
import { preloadRegistrationSettings } from '@/core/cms/adp/js/registrationSettings.js'
import { preloadPasswordResetSettings } from '@/core/cms/adp/js/passwordResetSettings.js'

import '@/js/utils/logger.js'

import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import '@/scss/styles.scss'

import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import { plugin as Slicksort } from 'vue-slicksort'
import Toast from 'vue-toastification'
import { getToastPluginOptions, syncToastPluginWithSettings } from '@/js/utils/toast.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { initEndpoints } from '@/js/api/endpoints.js'
import { DEFAULT_SITE_NAME } from '@/js/siteWordmark.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import tokenService from '@/core/cms/js/tokenService.js'
import { restoreSession } from '@/core/cms/js/tokenRefresh.js'
import { hideBootstrapMask } from '@/js/bootstrapMask.js'
import { initTheme } from '@/js/theme-manager.js'

async function restoreSessionIfNeeded() {
  return restoreSession()
}

const app = createApp(App)
const pinia = createPinia()

app.directive('tooltip', {
  mounted(el) {
    if (window.bootstrap && window.bootstrap.Tooltip) {
      new window.bootstrap.Tooltip(el, { trigger: 'hover' })
    }
  },
})

app.use(pinia)

app.use(autoAnimatePlugin)
app.use(Slicksort)

app.use(Toast, getToastPluginOptions())
syncToastPluginWithSettings()

if (typeof document !== 'undefined') {
  document.title = DEFAULT_SITE_NAME
}

// Тема из localStorage сразу; актуальная тема с API — после mount
initTheme()

const [, hasSession] = await Promise.all([
  initEndpoints(),
  restoreSessionIfNeeded(),
])

if (hasSession) {
  await useUserStore().loadSessionBootstrap()
}

const router = await initRouter()
app.use(router)

app.mount('#app')

useUserStore().warmupAvatar()

const { syncSiteThemeFromApi } = await import('@/js/theme-service.js')
syncSiteThemeFromApi().catch(() => {})

Promise.all([
  preloadRegistrationSettings(),
  preloadPasswordResetSettings(),
]).catch(() => {})

// Защитный таймаут: если по какой-то причине App.vue не снял маску загрузки
// (ошибка роутера и т.п.), всё равно показываем интерфейс.
setTimeout(hideBootstrapMask, 4000)

if (authGuard.isAuthenticated()) {
  authGuard.startTokenValidation()
}
