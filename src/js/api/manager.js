import axios from 'axios'

import tokenService from '@/core/cms/js/tokenService'
import { performServerLogout } from '@/core/cms/js/tokenRefresh.js'
import { applyMaintenanceFromResponse, isMaintenanceResponse } from '@/composables/useMaintenanceMode.js'
import { resolveApiBaseUrl } from '@/js/api/baseUrl.js'
import { logError, sanitizeError } from '@/js/utils/logError.js'
import { getCurrentLocale } from '@/i18n/index.js'

/**
 * Класс для работы с API
 */
class ApiClient {
  constructor() {
    this.baseUrl = resolveApiBaseUrl()
    this.apiPath = 'api/'
    const fullBase = this.baseUrl ? `${this.baseUrl}${this.apiPath}` : `/${this.apiPath}`
    this.client = axios.create({
      baseURL: fullBase,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this._setupInterceptors()
  }

  /**
   * Настройка интерцепторов axios
   */
  _setupInterceptors() {
    // Интерцептор запросов: тихий refresh перед отправкой
    this.client.interceptors.request.use(async (config) => {
      if (tokenService.shouldRefresh()) {
        const access = await tokenService.tryRefresh()
        if (!access) {
          /* игнор, дадим серверу ответить 401 */
        }
      }
      const headers = config.headers || {}
      headers['Accept-Language'] = getCurrentLocale()
      config.headers = headers
      return config
    })

    // Интерцептор ответов: одноразовый silent refresh при 401 и повтор
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (applyMaintenanceFromResponse(error)) {
          return Promise.reject(error)
        }
        if (error.response?.status === 401 && !originalRequest?._retry) {
          originalRequest._retry = true
          const access = await tokenService.tryRefresh()
          if (access) {
            this._addAuthToken(originalRequest)
            return this.client(originalRequest)
          }
          this.logout()
          if (typeof window !== 'undefined' && window.location) {
            const path = window.location.pathname || ''
            // /start — не маршрут (есть /start-page); уводил на NotFound(requiresAuth) → цикл logout
            if (
              !path.includes('/start-page') &&
              !path.includes('/login') &&
              !path.includes('/register')
            ) {
              window.location.href = '/start-page'
            }
          }
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * Базовый метод для выполнения HTTP запросов
   */
  async _request(method, endpoint, dataOrParams = {}, needToken = true, requestConfig = {}, options = {}) {
    try {
      const config = { ...requestConfig }
      
      if (needToken) {
        this._addAuthToken(config)
      }

      // Обработка FormData
      if (dataOrParams instanceof FormData) {
        config.headers = {
          ...config.headers,
          'Content-Type': undefined
        }
      }

      let response
      switch (method.toUpperCase()) {
        case 'GET':
        case 'DELETE':
          config.params = dataOrParams
          response = await this.client[method.toLowerCase()](endpoint, config)
          break
        default: // POST, PUT, PATCH
          response = await this.client[method.toLowerCase()](endpoint, dataOrParams, config)
      }

      return this.handleResponse(response)
    } catch (error) {
      const status = error.response?.status
      if (options.quietStatuses?.includes(status)) {
        return {
          success: false,
          status,
          data: error.response?.data ?? null,
          message: error.response?.data?.detail
            || error.response?.data?.message
            || error.message,
        }
      }
      this.handleError(error)
      throw error
    }
  }

  // HTTP методы
  async get(endpoint, params = {}, needToken = true, options = {}) {
    return this._request('GET', endpoint, params, needToken, {}, options)
  }

  async post(endpoint, data = {}, needToken = true) {
    return this._request('POST', endpoint, data, needToken)
  }

  async put(endpoint, data = {}, needToken = true) {
    return this._request('PUT', endpoint, data, needToken)
  }

  async patch(endpoint, data = {}, needToken = true) {
    return this._request('PATCH', endpoint, data, needToken)
  }

  async delete(endpoint, params = {}, needToken = true) {
    return this._request('DELETE', endpoint, params, needToken)
  }

  /**
   * Скачивание файлов (бинарные данные)
   */
  async downloadFile(endpoint, params = {}, method = 'GET', needToken = true) {
    try {
      const config = { 
        responseType: 'blob'
      }
      
      if (needToken) {
        this._addAuthToken(config)
      }

      let response
      if (method.toUpperCase() === 'POST') {
        response = await this.client.post(endpoint, params, config)
      } else {
        config.params = params
        response = await this.client.get(endpoint, config)
      }

      if (response.data instanceof Blob) {
        return {
          success: true,
          data: response.data,
          message: 'Файл успешно загружен',
          status: response.status,
          headers: response.headers
        }
      } else {
        return {
          success: false,
          message: 'Получен некорректный формат файла',
          data: null
        }
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Ошибка при скачивании файла',
        data: null,
        status: error.response?.status
      }
    }
  }

  /**
   * Добавление токена авторизации в конфигурацию
   */
  _addAuthToken(config) {
    const token = tokenService.getAccess()
    if (token) {
      if (!config.headers) {
        config.headers = {}
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }

  /**
   * Выход из системы
   */
  async logout() {
    // Сначала локально — параллельные 401 перестают слать Authorization
    tokenService.clear()
    await performServerLogout()
  }

  /**
   * Обработка успешных ответов
   */
  handleResponse(response) {
    if (response.status >= 200 && response.status < 300) {
      const data = response.data || {}

      // Для DELETE-запросов с кодом 204
      if (response.status === 204) {
        return {
          success: true,
          data: null,
          message: 'Успешно удалено',
          status: response.status
        }
      }

      // Если сервер вернул success: false, сохраняем это значение
      const success = data.success !== undefined ? data.success : true

      return {
        success,
        data: data.data || data,
        message: data.message,
        status: response.status
      }
    }

    return {
      success: false,
      errors: response.data,
      status: response.status
    }
  }

  /**
   * Обработка ошибок
   */
  handleError(error) {
    const requestUrl = String(error?.config?.url || '')
    if (requestUrl.includes('client-log')) {
      return {
        success: false,
        message: error.message,
        status: error.response?.status,
        errors: error.response?.data,
      }
    }

    const status = error.response?.status
    const hadAuthHeader = Boolean(error?.config?.headers?.Authorization)

    // Ожидаемый 503 режима технических works — оверлей уже показан, без шума в консоли.
    if (isMaintenanceResponse(error)) {
      const { message } = sanitizeError(error)
      return {
        success: false,
        message,
        status,
        errors: error.response?.data,
      }
    }

    // Гость без Bearer — ожидаемый 401, интерцептор уже обработал сессию.
    if (status === 401 && !hadAuthHeader) {
      const { message } = sanitizeError(error)
      return {
        success: false,
        message,
        status,
        errors: error.response?.data,
      }
    }

    const { message } = sanitizeError(error)

    logError('API Error', error)

    return {
      success: false,
      message,
      status,
      errors: error.response?.data
    }
  }

  /**
   * Получить базовый URL
   */
  getBaseUrl() {
    return this.baseUrl
  }

  /**
   * Получить токен авторизации
   */
  getAuthToken() {
    return tokenService.getAccess()
  }
}

// Экспорт синглтона
export const apiClient = new ApiClient()
