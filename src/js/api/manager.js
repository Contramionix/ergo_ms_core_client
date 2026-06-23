import axios from 'axios'

import tokenService from '@/core/cms/js/tokenService'
import { resolveApiBaseUrl } from '@/js/api/baseUrl.js'

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
        try { 
          await tokenService.tryRefresh() 
        } catch (_) { 
          /* игнор, дадим серверу ответить 401 */ 
        }
      }
      return config
    })

    // Интерцептор ответов: одноразовый silent refresh при 401 и повтор
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest?._retry) {
          originalRequest._retry = true
          try {
            await tokenService.tryRefresh()
            this._addAuthToken(originalRequest)
            return this.client(originalRequest)
          } catch (e) {
            this.logout()
            if (typeof window !== 'undefined' && window.location) {
              if (!window.location.pathname.includes('/start') && !window.location.pathname.includes('/login')) {
                window.location.href = '/start'
              }
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
  async _request(method, endpoint, dataOrParams = {}, needToken = true, config = {}) {
    try {
      const requestConfig = { ...config }
      
      if (needToken) {
        this._addAuthToken(requestConfig)
      }

      // Обработка FormData
      if (dataOrParams instanceof FormData) {
        requestConfig.headers = {
          ...requestConfig.headers,
          'Content-Type': undefined
        }
      }

      let response
      switch (method.toUpperCase()) {
        case 'GET':
        case 'DELETE':
          requestConfig.params = dataOrParams
          response = await this.client[method.toLowerCase()](endpoint, requestConfig)
          break
        default: // POST, PUT, PATCH
          response = await this.client[method.toLowerCase()](endpoint, dataOrParams, requestConfig)
      }

      return this.handleResponse(response)
    } catch (error) {
      this.handleError(error)
      throw error
    }
  }

  // HTTP методы
  async get(endpoint, params = {}, needToken = true) {
    return this._request('GET', endpoint, params, needToken)
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
   * Загрузка файлов
   */
  async upload(endpoint, formData, needToken = true, onUploadProgress) {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
      
      if (needToken) {
        this._addAuthToken(config)
      }
      
      if (typeof onUploadProgress === 'function') {
        config.onUploadProgress = onUploadProgress
      }
      
      const response = await this.client.post(endpoint, formData, config)
      return this.handleResponse(response)
    } catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Получение списка загруженных файлов
   */
  async getUploadedFiles(endpoint, needToken = true) {
    return this.get(endpoint, {}, needToken)
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
    } else {
      console.warn('Токен не найден в cookies')
    }
    return config
  }

  /**
   * Выход из системы
   */
  logout() {
    tokenService.clear()
  }

  /**
   * Проверка валидности токена
   */
  isTokenValid() {
    const token = tokenService.getAccess()
    if (!token) {
      console.log('Токен отсутствует')
      return false
    }

    console.log('Токен найден, длина:', token.length)
    return true
  }

  /**
   * Получение текущего токена
   */
  getCurrentToken() {
    return tokenService.getAccess()
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
    // Извлекаем сообщение об ошибке из разных возможных мест
    const errorMessage = 
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.response?.data?.detail ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message ||
      'Ошибка сервера'

    const status = error.response?.status
    const statusText = error.response?.statusText

    console.error(`API Error [${status || 'undefined'}${statusText ? ' ' + statusText : ''}]:`, errorMessage)

    return {
      success: false,
      message: errorMessage,
      status: status,
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
