/**
 * МЕНЕДЖЕР УПРАВЛЕНИЯ СЕПАРАТОРАМИ МЕНЮ
 * 
 * Класс для управления адаптивными разделителями в меню
 */

export class SeparatorManager {
  constructor(config = {}) {
    this.config = config
    this.separatorSettings = config.separatorSettings || {}
    this.separators = config.separators || {}
  }

  /**
   * Обновляет конфигурацию сепараторов
   * @param {Object} config - новая конфигурация
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config }
    this.separatorSettings = config.separatorSettings || this.separatorSettings
    this.separators = config.separators || this.separators
  }

  /**
   * Получает сепараторы по индексу порядка
   * @returns {Object}
   */
  getOrderBasedSeparators() {
    if (!this.separators.byOrderIndex) {
      return {}
    }

    const result = {}
    Object.entries(this.separators.byOrderIndex).forEach(([key, value]) => {
      const index = parseInt(key)
      if (index >= 0) {
        result[index] = value
      }
    })

    return result
  }

  /**
   * Генерирует адаптивные сепараторы
   * @returns {Object}
   */
  generateAdaptiveSeparators() {
    const result = {}
    
    if (this.separatorSettings.useOrderBased && this.separators.byOrderIndex) {
      Object.assign(result, this.getOrderBasedSeparators())
    }

    return result
  }

  /**
   * Получает сепаратор по индексу
   * @param {number} index - индекс элемента меню
   * @returns {string|null}
   */
  getSeparatorAt(index) {
    const separators = this.generateAdaptiveSeparators()
    return separators[index] || null
  }

  /**
   * Проверяет, должен ли отображаться сепаратор
   * @param {number} index - индекс элемента меню
   * @returns {boolean}
   */
  shouldShowSeparator(index) {
    return this.getSeparatorAt(index) !== null
  }

  /**
   * Устанавливает сепаратор для индекса
   * @param {number} index - индекс
   * @param {string} label - название сепаратора
   */
  setSeparatorAt(index, label) {
    if (!this.separators.byOrderIndex) {
      this.separators.byOrderIndex = {}
    }
    this.separators.byOrderIndex[index] = label
  }

  /**
   * Удаляет сепаратор по индексу
   * @param {number} index - индекс
   */
  removeSeparatorAt(index) {
    if (this.separators.byOrderIndex) {
      delete this.separators.byOrderIndex[index]
    }
  }

  /**
   * Получает все сепараторы
   * @returns {Object}
   */
  getAllSeparators() {
    return this.generateAdaptiveSeparators()
  }

  /**
   * Очищает все сепараторы
   */
  clearSeparators() {
    this.separators = {}
  }

  /**
   * Получает статистику
   * @returns {Object}
   */
  getStatistics() {
    const separators = this.generateAdaptiveSeparators()
    return {
      total: Object.keys(separators).length,
      indices: Object.keys(separators).map(k => parseInt(k))
    }
  }
}

export default SeparatorManager

