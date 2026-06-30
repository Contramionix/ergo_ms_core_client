import { initRouter } from '@/js/routers.js'
import { authGuard } from '@/core/cms/js/authGuard.js'
import { preloadRegistrationSettings } from '@/core/cms/adp/js/registrationSettings.js'
import { preloadPasswordResetSettings } from '@/core/cms/adp/js/passwordResetSettings.js'

import '@/js/utils/logger.js'

import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import '@he-tree/vue/style/default.css'
import '@he-tree/vue/style/material-design.css'

import '@/scss/styles.scss'

import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import { setupCalendar } from 'v-calendar'
import { plugin as Slicksort } from 'vue-slicksort'
import Toast from 'vue-toastification'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { initEndpoints } from '@/js/api/endpoints.js'
import { ensureSiteNameLoaded } from '@/composables/useSiteName.js'
import { getUserMenu } from '@/core/cms/js/menuService.js'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { hideBootstrapMask } from '@/js/bootstrapMask.js'

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

app.use(PerfectScrollbarPlugin)
app.use(autoAnimatePlugin)
app.use(Slicksort)

app.use(Toast, {
  position: 'top-center',
  maxToasts: 3,
  timeout: 2000,
  showCloseButtonOnHover: true,
})

app.use(setupCalendar, {
  color: 'red',
})

await initEndpoints()
await ensureSiteNameLoaded()

const { syncSiteThemeFromApi } = await import('@/js/theme-service.js')
await syncSiteThemeFromApi()

if (authGuard.isAuthenticated()) {
  // Полностью готовим пользователя (данные + профиль + кеш аватарки) и меню до
  // монтирования — иначе данные приходят поэтапно и аватар/иконки дёргаются.
  await Promise.all([
    useUserStore().ensureUserReady(),
    getUserMenu(),
  ])
}

const router = await initRouter()
app.use(router)

await Promise.all([
  preloadRegistrationSettings(),
  preloadPasswordResetSettings(),
])

app.mount('#app')

// Защитный таймаут: если по какой-то причине App.vue не снял маску загрузки
// (ошибка роутера и т.п.), всё равно показываем интерфейс.
setTimeout(hideBootstrapMask, 4000)

if (authGuard.isAuthenticated()) {
  authGuard.startTokenValidation()
}
