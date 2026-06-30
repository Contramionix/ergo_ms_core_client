import { initRouter } from '@/js/routers.js'
import { authGuard } from '@/core/cms/js/authGuard.js'
import { preloadRegistrationSettings } from '@/core/cms/adp/js/registrationSettings.js'
import { preloadPasswordResetSettings } from '@/core/cms/adp/js/passwordResetSettings.js'

import '@/js/utils/logger.js'

import 'bootstrap/dist/css/bootstrap.min.css'
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

const router = await initRouter()
app.use(router)

await Promise.all([
  preloadRegistrationSettings(),
  preloadPasswordResetSettings(),
])

app.mount('#app')

if (authGuard.isAuthenticated()) {
  authGuard.startTokenValidation()
}
