/**
 * Сервис для управления модальным окном построения графиков
 */

class BIChartsService {
  constructor() {
    this.listeners = new Set()
    this.isOpen = false
    this.fileId = null
  }

  open(fileId) {
    this.fileId = fileId
    this.isOpen = true
    this.notifyListeners()
  }

  close() {
    this.isOpen = false
    this.fileId = null
    this.notifyListeners()
  }

  toggle(fileId) {
    if (this.isOpen) {
      this.close()
    } else {
      this.open(fileId)
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
        callback(this.isOpen, this.fileId)
      } catch (error) {
        console.error('Ошибка в слушателе BI Charts Service:', error)
      }
    })
  }
}

export const biChartsService = new BIChartsService()
export default BIChartsService
