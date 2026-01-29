import { apiClient } from '@/js/api/manager'
import { ragClient } from '../../rag/js/rag-client.js'

/**
 * API Endpoints для TP модуля AI Assistant
 */
const endpoints = {
  documents: 'ai_assistant/tp_documents/',
  documentDetail: (id) => `ai_assistant/tp_documents/${id}/`,
  chatStream: 'ai_assistant/tp_chat/stream/',
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
      
      if (response.success) {
        return {
          success: true,
          documents: response.data.documents || [],
          count: response.data.count || 0,
          errors: response.data.errors || null,
        }
      }
      
      return {
        success: false,
        error: response.data?.error || 'Не удалось загрузить документы',
        errors: response.data?.errors || null,
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
   * Отправить сообщение в чат с техпроцессами (streaming)
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
      requestBody.ollama_config = {
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
        top_k: config.top_k,
        repeat_penalty: config.repeat_penalty,
        seed: config.seed,  // Seed для воспроизводимости результатов
      }
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulatedContent = ''
      let doneEventReceived = false

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const event = JSON.parse(jsonStr)
              
              if (event.type === 'chunk' && onChunk) {
                accumulatedContent += event.text
                console.log('[TP Client] Chunk получен (длина:', event.text?.length || 0, '):', event.text?.substring(0, 100))
                onChunk(event.text)
              } else if (event.type === 'done') {
                doneEventReceived = true
                const finalResponse = event.full_response || accumulatedContent
                console.log('[TP Client] Done событие получено. Полный ответ (длина:', finalResponse?.length || 0, '):', finalResponse?.substring(0, 500))
                console.log('[TP Client] Metadata:', {
                  session_id: event.session_id,
                  message_id: event.message_id,
                  processing_time_ms: event.processing_time_ms,
                })
                if (onDone) {
                  onDone(finalResponse, {
                    session_id: event.session_id,
                    message_id: event.message_id,
                    processing_time_ms: event.processing_time_ms,
                    timestamp: event.timestamp,
                  })
                }
              } else if (event.type === 'error' && onError) {
                doneEventReceived = true
                console.error('[TP Client] Error событие:', event.message)
                onError(event.message)
              } else {
                console.log('[TP Client] Неизвестный тип события:', event.type, event)
              }
            } catch (parseError) {
              console.warn('[TP Client] Ошибка парсинга SSE события:', parseError, jsonStr)
            }
          }
        }
      }

      if (!doneEventReceived && accumulatedContent && onDone) {
        onDone(accumulatedContent)
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
