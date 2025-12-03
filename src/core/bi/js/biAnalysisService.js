/**
 * Сервис для управления модальным окном BI анализа
 */

class BIAnalysisService {
  constructor() {
    this.listeners = new Set()
    this.isOpen = false
  }

  /**
   * Открывает модальное окно BI анализа
   */
  open() {
    this.isOpen = true
    this.notifyListeners()
  }

  /**
   * Закрывает модальное окно BI анализа
   */
  close() {
    this.isOpen = false
    this.notifyListeners()
  }

  /**
   * Переключает состояние модального окна
   */
  toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  /**
   * Регистрирует слушатель изменений состояния
   * @param {Function} callback - функция обратного вызова
   * @returns {Function} функция для отмены подписки
   */
  subscribe(callback) {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Уведомляет всех слушателей об изменении состояния
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.isOpen)
      } catch (error) {
        console.error('Ошибка в слушателе BI Analysis Service:', error)
      }
    })
  }
}

// Создаем единственный экземпляр сервиса
export const biAnalysisService = new BIAnalysisService()
export default BIAnalysisService

