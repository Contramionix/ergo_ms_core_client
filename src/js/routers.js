/**
 * КОНФИГУРАЦИЯ МАРШРУТИЗАЦИИ ПРИЛОЖЕНИЯ ERGO MS
 * 
 * Данный файл содержит инициализацию Vue Router с автоматической генерацией
 * маршрутов из модульной системы. Это обеспечивает единый источник истины
 * для структуры приложения и устраняет дублирование кода.
 * 
 * Архитектура:
 * - modules/: модульная система управления роутами, меню, эндпоинтами и иконками
 * - menu-config.json: конфигурация меню модулей
 * - routes.js: конфигурация роутов модулей
 * - routers.js: инициализирует Vue Router с сгенерированными маршрутами
 * 
 * Функциональность:
 * - Автоматическая генерация маршрутов через ModuleManager
 * - Валидация конфигурации при инициализации
 * - Поддержка ленивой загрузки компонентов
 * - Настроена защита маршрутов через beforeEach guard
 * - Интегрирована система управления доступом через GroupsPolitics
 * - ООП подход с использованием менеджеров (RouteManager, MenuManager и др.)
 */

import { createRouter, createWebHistory } from 'vue-router'
import { checkToken } from '@/core/cms/adp/js/auth-index'
import { generateAllRoutes, validateAll } from '@/modules/index.js'
import { useUserStore } from '@/core/cms/js/userStore.js'

// Генерация маршрутов из JSON конфигурации (async)
const routes = await generateAllRoutes()

// Валидация конфигурации при запуске (async)
const validation = await validateAll()
if (!validation.isValid) {
  console.error('❌ Обнаружены ошибки в конфигурации:', validation)
}
if (validation.routes?.warnings?.length > 0 || validation.menu?.warnings?.length > 0) {
  console.warn('⚠️ Предупреждения конфигурации:', validation)
}

routes.forEach((route) => {
  if (!route.meta || !Object.prototype.hasOwnProperty.call(route.meta, 'startRoute')) {
    route.meta = route.meta || {}
    route.meta.startRoute = false
  }
})

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

import { checkAccessToPage, CheckAccessToComponents } from '../core/cms/adp/admin/js/GroupsPolitics'
async function runCheckToken() {
  const isChecked = await checkToken()
  return isChecked
}

router.beforeEach(async (to, from, next) => {
  try {
    // 1) нужна авторизация?
    if (to.meta.requiresAuth && !(await runCheckToken())) {
      // Очищаем токены при неудачной проверке
      import('./api/manager').then(({ apiClient }) => {
        apiClient.logout()
      })
      return next({ name: 'StartPage' })
    }

    // 2) requiresAdmin для страниц
    if (to.meta && to.meta.requiresAdmin) {
      let isAdmin = false
      try {
        const userStore = useUserStore()
        if (!userStore.isInitialized) {
          try { await userStore.initializeUser() } catch {
            // Игнорируем ошибки инициализации
          }
        }
        const uid = userStore.user?.id
        if (uid) {
          const { apiClient } = await import('./api/manager')
          const resp = await apiClient.get(`/project_ed/profiles/profiles/${uid}/`)
          const data = resp.data || {}
          const roleName = data.role_name || data.profile?.role_name
          if (roleName === 'Администратор') isAdmin = true
        }
      } catch {
        // Игнорируем ошибки проверки роли
      }

      if (!isAdmin) {
        const userStore = useUserStore()
        const uid = userStore.user?.id
        if (uid === undefined || uid === null) {
          return next({ name: 'StartPage' })
        }
        return next({ name: 'NotFound' })
      }
    }

    // 3) requiresOrganization для страниц настроек организации
    if (to.meta && to.meta.requiresOrganization) {
      try {
        const { apiClient } = await import('./api/manager')
        const resp = await apiClient.get('/organizations/organizations/')
        
        if (resp.success && resp.data) {
          const organizations = Array.isArray(resp.data) 
            ? resp.data 
            : (resp.data.results || resp.data.items || [])
          
          if (organizations.length === 0) {
            // Если у пользователя нет организаций - показываем NotFound
            return next({ name: 'NotFound' })
          }
        } else {
          // Если запрос не успешен или нет данных - показываем NotFound
          return next({ name: 'NotFound' })
        }
      } catch (error) {
        // При ошибке проверки также показываем NotFound
        console.error('Ошибка проверки организации:', error)
        return next({ name: 'NotFound' })
      }
    }

    // 4) page / component ACL (выполняем параллельно)
    await Promise.all([
      checkAccessToPage(to.path),
      CheckAccessToComponents(to.path),
    ])

    next()
  } catch (err) {
    console.error('Router guard error:', err)
    // При ошибке также очищаем токены
    import('./api/manager').then(({ apiClient }) => {
      apiClient.logout()
    })
    next({ name: 'StartPage' })
  }
})

export default router;