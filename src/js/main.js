import { initRouter } from '@/js/routers.js'

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
import { bootstrapAppSession } from '@/js/bootstrapSession.js'
import { initTheme } from '@/js/theme-manager.js'

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

await Promise.all([initEndpoints(), initRouter()]).then(([, router]) => {
  app.use(router)
})

app.mount('#app')

void bootstrapAppSession()

useUserStore().warmupAvatar()

const { syncSiteThemeFromApi } = await import('@/js/theme-service.js')
syncSiteThemeFromApi().catch(() => {})

const { preloadModuleThemeManifests } = await import('@/modules/themes/ThemeDefaultsManager.js')
preloadModuleThemeManifests().catch(() => {})
