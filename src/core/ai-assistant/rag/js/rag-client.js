import { apiClient } from '@/js/api/manager'

/**
 * API Endpoints для RAG модуля AI Assistant
 */
const endpoints = {
  chat: 'ai_assistant/chat/',
  ollamaStatus: 'ai_assistant/ollama_status/',
}

/**
 * Клиент для работы с RAG Assistant (простой чат)
 */
class RAGClient {
  constructor() {
    this.ollamaAvailable = false
    this.lastCheck = 0
    this.checkInterval = 60000
    this.ollamaConfig = null // Настройки Ollama из module-config
  }

  /**
   * Устанавливает настройки Ollama из конфига модуля
   * @param {Object} config - настройки Ollama из module-config.json
   */
  setOllamaConfig(config) {
    this.ollamaConfig = config
  }

  /**
   * Проверка доступности Ollama
   */
  async checkOllamaStatus() {
    const now = Date.now()
    
    if (this.lastCheck && (now - this.lastCheck < this.checkInterval)) {
      return { available: this.ollamaAvailable }
    }

    try {
      const response = await apiClient.get(endpoints.ollamaStatus)
      
      if (response.success) {
        this.ollamaAvailable = response.data.available
        this.lastCheck = now
        
        return {
          available: this.ollamaAvailable,
          message: response.data.message,
        }
      }
      
      // Если success: false, но ответ получен
      return { 
        available: false, 
        message: response.data?.message || response.data?.error || 'Ошибка проверки статуса' 
      }
    } catch (error) {
      console.error('Ошибка проверки Ollama:', error)
      this.ollamaAvailable = false
      
      // Извлекаем сообщение об ошибке из разных возможных мест
      const errorMessage = 
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Не удалось подключиться к Ollama'
      
      return { 
        available: false, 
        message: errorMessage
      }
    }
  }

  /**
   * Отправить сообщение в чат
   * @param {string} message - Сообщение пользователя
   * @param {Object} ollamaConfig - настройки Ollama (опционально)
   * @returns {Promise<Object>}
   */
  async sendMessage(message, ollamaConfig = null) {
    try {
      // Используем настройки из параметра или из сохраненного конфига
      const config = ollamaConfig || this.ollamaConfig
      
      const requestBody = {
        message: message,
      }
      
      // Добавляем настройки Ollama, если они есть
      if (config) {
        requestBody.ollama_config = {
          base_url: config.baseUrl,
          model: config.model,
          temperature: config.temperature,
          context_window: config.contextWindow,
          max_tokens: config.maxTokens,
        }
      }
      
      const response = await apiClient.post(endpoints.chat, requestBody)

      if (response.success) {
        return {
          success: true,
          response: response.data.response || response.data.message,
        }
      }

      // Если success: false, но ответ получен
      return {
        success: false,
        error: response.data?.error || response.data?.message || 'Ошибка обработки запроса',
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      
      // Извлекаем сообщение об ошибке из разных возможных мест
      const errorMessage = 
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Не удалось отправить сообщение'
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}

export const ragClient = new RAGClient()
export default RAGClient

