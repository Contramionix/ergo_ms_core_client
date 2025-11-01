import { apiClient } from '@/js/api/manager'
import endpoints from './endpoints'

/**
 * Клиент для работы с BI Assistant (Fast BI)
 */
class BIClient {
  constructor() {
    this.ollamaAvailable = false
    this.lastCheck = 0
    this.checkInterval = 60000 // Проверяем раз в минуту
  }

  /**
   * Проверка доступности Ollama
   */
  async checkOllamaStatus() {
    const now = Date.now()
    
    // Кэшируем результат проверки
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
      
      return { available: false, message: 'Ошибка проверки статуса' }
    } catch (error) {
      console.error('Ошибка проверки Ollama:', error)
      this.ollamaAvailable = false
      return { available: false, message: error.message }
    }
  }

  /**
   * Получить список файлов пользователя
   */
  async getUserFiles() {
    try {
      const response = await apiClient.get(endpoints.files)
      
      if (response.success) {
        return {
          success: true,
          files: response.data.files || [],
          count: response.data.count || 0,
        }
      }
      
      return { success: false, files: [], error: 'Не удалось загрузить файлы' }
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error)
      return { success: false, files: [], error: error.message }
    }
  }

  /**
   * Отправить вопрос к выбранному файлу
   * @param {number} fileId - ID файла
   * @param {string} question - Вопрос
   * @param {boolean} wantCommentary - Нужен ли комментарий от AI
   */
  async askQuestion(fileId, question, wantCommentary = true) {
    try {
      console.log('🤖 Отправляю вопрос к BI Assistant...', { fileId, question })

      const response = await apiClient.post(endpoints.biQuery, {
        file_id: fileId,
        question: question,
        want_commentary: wantCommentary,
        stream: false, // Обычный режим
      })

      if (response.success) {
        console.log('✅ Получен ответ от BI Assistant')
        
        return {
          success: true,
          fileName: response.data.file_name,
          question: response.data.question,
          sql: response.data.sql,
          data: response.data.data,
          comment: response.data.comment,
          rows: response.data.rows,
          columns: response.data.columns,
        }
      }

      return {
        success: false,
        error: response.data?.error || 'Ошибка обработки запроса',
      }
    } catch (error) {
      console.error('❌ Ошибка BI Assistant:', error)
      
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка',
      }
    }
  }

  /**
   * Отправить вопрос к выбранному файлу со streaming
   * @param {number} fileId - ID файла
   * @param {string} question - Вопрос
   * @param {boolean} wantCommentary - Нужен ли комментарий от AI
   * @param {Function} onEvent - Callback для streaming событий
   */
  async askQuestionStream(fileId, question, wantCommentary = true, onEvent) {
    try {
      console.log('🤖 Начинаю streaming запрос к BI Assistant...', { fileId, question })

      const baseURL = apiClient.getBaseUrl() + apiClient.apiPath
      const token = apiClient.getAuthToken()
      
      const url = `${baseURL}${endpoints.biQuery}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_id: fileId,
          question: question,
          want_commentary: wantCommentary,
          stream: true, // Включаем streaming
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('✅ Streaming завершен')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (onEvent) {
                onEvent(data)
              }
            } catch (e) {
              console.warn('Не удалось распарсить SSE данные:', e)
            }
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('❌ Ошибка streaming:', error)
      
      if (onEvent) {
        onEvent({
          type: 'error',
          message: error.message || 'Ошибка подключения',
        })
      }
      
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка',
      }
    }
  }
}

export const biClient = new BIClient()

export default BIClient




