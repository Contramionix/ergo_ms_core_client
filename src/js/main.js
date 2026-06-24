import router from '@/js/routers.js'
import { authGuard } from '@/core/cms/js/authGuard.js' // Подключаем защиту аутентификации
import { preloadRegistrationSettings } from '@/core/cms/adp/js/registrationSettings.js'

// Подключаем систему логирования (автоматически переопределяет console)
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

const app = createApp(App)
const pinia = createPinia()

app.directive('tooltip', {
  mounted(el) {
    // Используем глобальный объект Bootstrap из bundle
    if (window.bootstrap && window.bootstrap.Tooltip) {
      new window.bootstrap.Tooltip(el, { trigger: 'hover' })
    }
  },
})

app.use(pinia)
app.use(router)
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

await preloadRegistrationSettings()

app.mount('#app')

// Запускаем проверку токена после полной инициализации приложения
if (authGuard.isAuthenticated()) {
  authGuard.startTokenValidation()
}