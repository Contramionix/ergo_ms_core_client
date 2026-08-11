import tokenService from '@/core/cms/js/tokenService'
import { useUserStore } from '@/core/cms/js/userStore.js'
import { isTransientNetworkError } from '@/core/cms/js/isTransientNetworkError.js'
import { savePostLoginReturnPath } from '@/core/cms/js/postLoginReturn.js'
import {
  canAttemptTokenRefresh,
  wasLastRefreshTransient,
} from '@/core/cms/js/tokenRefresh.js'
import {
  isRateLimitActive,
  showRateLimitNotice,
} from '@/composables/useRateLimitNotice.js'
import { logError, logWarn } from '@/js/utils/logError.js'

/**
 * Утилита для управления аутентификацией и автоматического logout
 */
export class AuthGuard {
  constructor() {
    this.tokenCheckInterval = null
    this.isCheckingToken = false
  }

  /**
   * Запускает периодическую проверку токена
   * @param {number} intervalMs Интервал проверки в миллисекундах (по умолчанию 5 минут)
   */
  startTokenValidation(intervalMs = 5 * 60 * 1000) {
    // Останавливаем предыдущий интервал если он был
    this.stopTokenValidation()

    this.tokenCheckInterval = setInterval(async () => {
      await this.validateCurrentToken()
    }, intervalMs)

    // Выполняем первую проверку сразу
    this.validateCurrentToken()
  }

  /**
   * Останавливает периодическую проверку токена
   */
  stopTokenValidation() {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval)
      this.tokenCheckInterval = null
    }
  }

  /**
   * Проверяет текущий токен и выполняет logout если он недействителен
   */
  async validateCurrentToken() {
    if (this.isCheckingToken) {
      return // Предотвращаем множественные одновременные проверки
    }

    const token = tokenService.getAccess()
    if (!token) {
      return // Если токена нет, проверка не нужна
    }

    this.isCheckingToken = true

    try {
      // Сначала локально: если срок на исходе — пробуем тихий refresh
      if (tokenService.shouldRefresh(90)) {
        const access = await tokenService.tryRefresh()
        if (access) {
          this.isCheckingToken = false
          return
        }
        /* пойдём к серверной проверке */
      }

      // Проверяем через userStore, если пользователь уже инициализирован
      // Это позволяет избежать лишних запросов к API
      try {
        const userStore = useUserStore()

        // Если пользователь инициализирован, считаем токен валидным
        // (initializeUser уже проверил сессию через session-bootstrap / restore)
        if (userStore.isInitialized && userStore.isAuthenticated) {
          this.isCheckingToken = false
          return
        }
      } catch (_) {
        // Если не удалось получить userStore, продолжаем проверку через API
      }

      // Валидация на сервере (динамический импорт для избежания циркулярной зависимости)
      const { authService } = await import('@/core/cms/adp/js/auth')
      const isValid = await authService.checkToken()
      if (!isValid) {
        // 429/мигание refresh — оверлей, не страница логина
        if (wasLastRefreshTransient() || isRateLimitActive() || canAttemptTokenRefresh()) {
          if (!isRateLimitActive()) {
            showRateLimitNotice(0)
          }
          logWarn('Проверка токена отложена: сессия ещё может быть жива')
          return
        }
        this.forceLogout()
      }
    } catch (error) {
      if (isTransientNetworkError(error)) {
        if (error.response?.status === 429 && !isRateLimitActive()) {
          showRateLimitNotice(0)
        }
        logWarn('Проверка токена пропущена: API временно недоступен', error)
        return
      }
      logError('Ошибка при проверке токена:', error)
      // Явный отказ auth / неожиданная ошибка с ответом сервера
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (wasLastRefreshTransient() || isRateLimitActive() || canAttemptTokenRefresh()) {
          if (!isRateLimitActive()) {
            showRateLimitNotice(0)
          }
          return
        }
        this.forceLogout()
      }
    } finally {
      this.isCheckingToken = false
    }
  }

  /**
   * Принудительно выполняет logout и перенаправляет на стартовую страницу
   */
  async forceLogout() {
    savePostLoginReturnPath()
    // Очищаем токены (динамический импорт для избежания циркулярной зависимости)
    const { authService } = await import('@/core/cms/adp/js/auth')
    authService.logout('authGuard.forceLogout')

    // Останавливаем проверку токена
    this.stopTokenValidation()

    // Перенаправляем на стартовую страницу
    if (typeof window !== 'undefined' && window.location) {
      const path = window.location.pathname || ''
      if (
        !path.includes('/start-page')
        && !path.includes('/login')
        && !path.includes('/register')
      ) {
        window.location.href = '/start-page'
      }
    }
  }

  /**
   * Проверяет, авторизован ли пользователь
   */
  isAuthenticated() {
    return !!tokenService.getAccess()
  }
}

// Создаем глобальный экземпляр
export const authGuard = new AuthGuard()

// Запуск проверки токена вынесен в main.js для избежания циркулярных зависимостей при инициализации
