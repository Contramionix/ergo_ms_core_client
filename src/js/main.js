import { initRouter } from '@/js/routers.js'
import { authGuard } from '@/core/cms/js/authGuard.js'

import '@/js/utils/logger.js'

import '@/scss/styles.scss'

import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import Toast from 'vue-toastification'
import { getToastPluginOptions, syncToastPluginWithSettings } from '@/js/utils/toast.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { initEndpoints } from '@/js/api/endpoints.js'
import { DEFAULT_SITE_NAME } from '@/js/siteWordmark.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { restoreSession } from '@/core/cms/js/tokenRefresh.js'
import { hideBootstrapMask } from '@/js/bootstrapMask.js'
import { initTheme } from '@/js/theme-manager.js'

async function restoreSessionIfNeeded() {
  return restoreSession()
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(autoAnimatePlugin)
app.use(Toast, getToastPluginOptions())
syncToastPluginWithSettings()

if (typeof document !== 'undefined') {
  document.title = DEFAULT_SITE_NAME
}

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

setTimeout(hideBootstrapMask, 4000)

if (authGuard.isAuthenticated()) {
  authGuard.startTokenValidation()
}
