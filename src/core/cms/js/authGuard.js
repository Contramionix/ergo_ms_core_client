import tokenService from '@/core/cms/js/tokenService'
import { useUserStore } from '@/core/cms/js/userStore.js'

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
        try { 
          await tokenService.tryRefresh()
          this.isCheckingToken = false
          return 
        } catch (_) { 
          /* пойдём к серверной проверке */ 
        }
      }

      // Проверяем через userStore, если пользователь уже инициализирован
      // Это позволяет избежать лишних запросов к API
      try {
        const userStore = useUserStore()
        
        // Если пользователь инициализирован, считаем токен валидным
        // (так как initializeUser уже проверил его через /protected/)
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
      if (!isValid) this.forceLogout()
    } catch (error) {
      logError('Ошибка при проверке токена:', error)
      // При ошибке проверки также выполняем logout
      this.forceLogout()
    } finally {
      this.isCheckingToken = false
    }
  }

  /**
   * Принудительно выполняет logout и перенаправляет на стартовую страницу
   */
  async forceLogout() {
    // Очищаем токены (динамический импорт для избежания циркулярной зависимости)
    const { authService } = await import('@/core/cms/adp/js/auth')
    authService.logout()
    
    // Останавливаем проверку токена
    this.stopTokenValidation()
    
    // Перенаправляем на стартовую страницу
    if (typeof window !== 'undefined' && window.location) {
      if (!window.location.pathname.includes('/start') && !window.location.pathname.includes('/login')) {
        window.location.href = '/start'
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