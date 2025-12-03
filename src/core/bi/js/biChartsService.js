/**
 * Сервис для управления модальным окном построения графиков
 */

class BIChartsService {
  constructor() {
    this.listeners = new Set()
    this.isOpen = false
    this.fileId = null
  }

  /**
   * Открывает модальное окно построения графиков
   * @param {number} fileId - ID файла для построения графиков
   */
  open(fileId) {
    this.fileId = fileId
    this.isOpen = true
    this.notifyListeners()
  }

  /**
   * Закрывает модальное окно построения графиков
   */
  close() {
    this.isOpen = false
    this.fileId = null
    this.notifyListeners()
  }

  /**
   * Переключает состояние модального окна
   * @param {number} fileId - ID файла для построения графиков
   */
  toggle(fileId) {
    if (this.isOpen) {
      this.close()
    } else {
      this.open(fileId)
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
        callback(this.isOpen, this.fileId)
      } catch (error) {
        console.error('Ошибка в слушателе BI Charts Service:', error)
      }
    })
  }
}

// Создаем единственный экземпляр сервиса
export const biChartsService = new BIChartsService()
export default BIChartsService

