/**
 * ЗАГРУЗЧИК КОНФИГУРАЦИИ МЕНЮ
 * 
 * Простой импорт конфигурации через алиас @menu-order-config,
 * который автоматически выбирает пользовательский или стандартный конфиг
 * на этапе сборки Vite.
 */

import menuOrderConfig from '@menu-order-config'

/**
 * Получает конфигурацию меню
 * @returns {Object} Конфигурация меню
 */
export function getMenuOrderConfig() {
  return menuOrderConfig
}

/**
 * Экспортируем конфигурацию по умолчанию
 */
export default menuOrderConfig
