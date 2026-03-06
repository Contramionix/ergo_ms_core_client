/**
 * Сервис для управления модальным окном BI анализа
 */

class BIAnalysisService {
  constructor() {
    this.listeners = new Set()
    this.isOpen = false
  }

  open() {
    this.isOpen = true
    this.notifyListeners()
  }

  close() {
    this.isOpen = false
    this.notifyListeners()
  }

  toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  subscribe(callback) {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

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

export const biAnalysisService = new BIAnalysisService()
export default BIAnalysisService
