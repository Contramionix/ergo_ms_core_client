import { apiClient } from '@/js/api/manager'
import { ragClient } from '../../rag/js/rag-client.js'

/**
 * API Endpoints для TP модуля AI Assistant
 */
const endpoints = {
  documents: 'ai_assistant/tp_documents/',
  documentDetail: (id) => `ai_assistant/tp_documents/${id}/`,
  uploadStatus: (taskId) => `ai_assistant/tp_documents/upload_status/${taskId}/`,
  chatStream: 'ai_assistant/tp_chat/stream/',
  chatStatus: (taskId) => `ai_assistant/tp_chat/status/${taskId}/`,
  chatSessions: 'ai_assistant/chat_sessions/',
}

/**
 * Клиент для работы с TP Assistant (техпроцессы)
 */
class TPClient {
  constructor() {
    this.ollamaConfig = null
  }

  /**
   * Устанавливает настройки Ollama из конфига модуля
   * @param {Object} config - настройки Ollama из module-config
   */
  setOllamaConfig(config) {
    this.ollamaConfig = config
  }

  /**
   * Получить список документов техпроцессов для сессии
   * @param {string} sessionId - ID сессии чата (обязательно)
   */
  async getDocuments(sessionId) {
    if (!sessionId) {
      return {
        success: false,
        documents: [],
        error: 'Не указан session_id. Создайте новый чат перед загрузкой документов.'
      }
    }
    
    try {
      const response = await apiClient.get(endpoints.documents, {
        session_id: sessionId
      })
      
      if (response.success) {
        return {
          success: true,
          documents: response.data.documents || [],
          count: response.data.count || 0,
        }
      }
      
      return {
        success: false,
        documents: [],
        error: response.data?.error || 'Не удалось загрузить документы'
      }
    } catch (error) {
      console.error('Ошибка загрузки документов:', error)
      return {
        success: false,
        documents: [],
        error: error.message || 'Не удалось загрузить документы'
      }
    }
  }

  /**
   * Получить документ по ID
   */
  async getDocument(documentId) {
    try {
      const response = await apiClient.get(endpoints.documentDetail(documentId))
      
      if (response.success) {
        return {
          success: true,
          document: response.data.document,
        }
      }
      
      return {
        success: false,
        error: response.data?.error || 'Документ не найден'
      }
    } catch (error) {
      console.error('Ошибка получения документа:', error)
      return {
        success: false,
        error: error.message || 'Не удалось получить документ'
      }
    }
  }

  /**
   * Загрузить документы техпроцессов (DOCX) - множественная загрузка
   * Названия документов автоматически берутся из имен файлов
   * @param {File[]} files - массив файлов для загрузки
   * @param {string} sessionId - ID сессии чата (обязательно)
   * @param {Object} metadata - дополнительные метаданные
   */
  async uploadDocuments(files, sessionId, metadata = {}) {
    if (!sessionId) {
      return {
        success: false,
        error: 'Не указан session_id. Создайте новый чат перед загрузкой документов.',
        documents: [],
        errors: null,
      }
    }
    
    try {
      const formData = new FormData()
      
      // Добавляем session_id (обязательно)
      formData.append('session_id', sessionId)
      
      // Добавляем все файлы
      files.forEach(file => {
        formData.append('files', file)
      })
      
      if (Object.keys(metadata).length > 0) {
        formData.append('metadata', JSON.stringify(metadata))
      }
      
      const response = await apiClient.post(endpoints.documents, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const data = response.data || response
      if (response.success && data.task_id) {
        return {
          success: true,
          task_id: data.task_id,
          async: true,
          message: data.message || 'Документы поставлены в очередь.',
        }
      }
      if (response.success) {
        return {
          success: true,
          documents: data.documents || [],
          count: data.count || 0,
          errors: data.errors || null,
          message: data.message || null,
        }
      }

      return {
        success: false,
        error: data?.error || 'Не удалось загрузить документы',
        errors: data?.errors || null,
      }
    } catch (error) {
      console.error('Ошибка загрузки документов:', error)
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Не удалось загрузить документы',
        errors: error.response?.data?.errors || null,
      }
    }
  }

  /**
   * Загрузить один документ техпроцесса (DOCX) - для обратной совместимости
   * @deprecated Используйте uploadDocuments для множественной загрузки
   */
  async uploadDocument(file, metadata = {}) {
    const result = await this.uploadDocuments([file], metadata)
    if (result.success && result.documents && result.documents.length > 0) {
      return {
        success: true,
        document: result.documents[0],
      }
    }
    return {
      success: false,
      error: result.error || 'Не удалось загрузить документ',
    }
  }

  /**
   * Опрос статуса асинхронной загрузки документов по task_id
   * @param {string} taskId - ID задачи Celery
   */
  async getUploadStatus(taskId) {
    if (!taskId) {
      return { success: false, error: 'Не указан task_id' }
    }
    try {
      const response = await apiClient.get(endpoints.uploadStatus(taskId))
      const data = response.data || response
      return {
        success: response.success,
        status: data.status,
        task_id: data.task_id,
        documents: data.documents || [],
        count: data.count || 0,
        errors: data.errors || null,
        message: data.message || null,
        error: data.error || null,
      }
    } catch (error) {
      console.error('Ошибка опроса статуса загрузки:', error)
      return {
        success: false,
        status: 'FAILURE',
        error: error.message || 'Ошибка опроса статуса',
      }
    }
  }

  /**
   * Удалить документ техпроцесса
   */
  async deleteDocument(documentId) {
    try {
      const response = await apiClient.delete(endpoints.documentDetail(documentId))
      
      if (response.success) {
        return {
          success: true,
          message: response.data?.message || 'Документ удален'
        }
      }
      
      return {
        success: false,
        error: response.data?.error || 'Не удалось удалить документ'
      }
    } catch (error) {
      console.error('Ошибка удаления документа:', error)
      return {
        success: false,
        error: error.message || 'Не удалось удалить документ'
      }
    }
  }

  /**
   * Опрос статуса задачи ответа модели в чате техпроцессов по task_id
   */
  async getChatStatus(taskId) {
    if (!taskId) {
      return { success: false, status: 'FAILURE', error: 'Не указан task_id' }
    }
    try {
      const response = await apiClient.get(endpoints.chatStatus(taskId))
      const data = response.data || response
      return {
        success: response.success,
        status: data.status,
        task_id: data.task_id,
        full_response: data.full_response,
        message_id: data.message_id,
        session_id: data.session_id,
        processing_time_ms: data.processing_time_ms,
        timestamp: data.timestamp,
        error: data.error,
      }
    } catch (error) {
      console.error('Ошибка опроса статуса чата:', error)
      return {
        success: false,
        status: 'FAILURE',
        error: error.message || 'Ошибка опроса статуса',
      }
    }
  }

  /**
   * Отправить сообщение в чат с техпроцессами (асинхронно через Celery, опрос статуса)
   */
  async sendMessageStream(message, onChunk, onDone, onError, sessionId = null) {
    const config = this.ollamaConfig

    const requestBody = {
      message: message,
    }
    if (sessionId) {
      requestBody.session_id = sessionId
    }
    if (config) {
      requestBody.ollama_config = { ...config }
    }

    try {
      const baseUrl = apiClient.client?.defaults?.baseURL || `${apiClient.getBaseUrl()}api/`
      const url = `${baseUrl}${endpoints.chatStream}`
      const token = apiClient.getAuthToken()

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 202 && data.task_id) {
        if (onDone) {
          onDone(null, { task_id: data.task_id, session_id: data.session_id, async: true })
        }
        return
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`)
      }

      if (onDone) {
        onDone(data.full_response || '', {
          session_id: data.session_id,
          message_id: data.message_id,
          processing_time_ms: data.processing_time_ms,
          timestamp: data.timestamp,
        })
      }
    } catch (error) {
      console.error('Ошибка streaming сообщения:', error)
      if (onError) {
        onError(error.message || 'Не удалось отправить сообщение')
      }
    }
  }

  /**
   * Получить список сессий чата для модуля tp
   */
  async getChatSessions() {
    return await ragClient.getChatSessions('tp')
  }

  /**
   * Получить сессию чата по ID
   */
  async getChatSession(sessionId) {
    return await ragClient.getChatSession(sessionId)
  }

  /**
   * Удалить сессию чата
   */
  async deleteChatSession(sessionId) {
    return await ragClient.deleteChatSession(sessionId)
  }
}

export const tpClient = new TPClient()
export default TPClient
