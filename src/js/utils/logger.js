/**
 * Система логирования с уровнями.
 */

import { clientEnv } from '@/js/clientEnv.js'

const LOG_LEVELS = {
  debug: 0,    // console.log, console.debug
  info: 1,     // console.info
  warn: 2,     // console.warn
  error: 3,    // console.error
  critical: 4, // console.error (всегда)
  silent: 99   // Полностью отключить все логи
}

// Сохраняем оригинальные методы console
const originalConsole = {
  log: console.log.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
}

class ConsoleLogger {
  constructor() {
    // Определяем текущий уровень логирования из переменных окружения
    // По умолчанию: development = debug, production = critical
    const isDev = import.meta.env.DEV
    const envLogLevel = clientEnv.logLevel
    
    this.currentLevel = LOG_LEVELS[envLogLevel] ?? (isDev ? LOG_LEVELS.debug : LOG_LEVELS.critical)
    this.isProd = import.meta.env.PROD
    this.originalConsole = originalConsole
  }

  /**
   * Проверка, нужно ли логировать сообщение
   */
  shouldLog(level) {
    if (this.currentLevel === LOG_LEVELS.silent) {
      return false
    }
    if (this.currentLevel === LOG_LEVELS.critical) {
      return level === 'error'
    }
    return LOG_LEVELS[level] >= this.currentLevel
  }

  /**
   * Переопределяем методы console глобально
   */
  overrideConsole() {
    // console.log - только для разработки (уровень debug)
    console.log = (...args) => {
      if (this.shouldLog('debug')) {
        originalConsole.log(...args)
      }
    }

    // console.debug - только для разработки (уровень debug)
    console.debug = (...args) => {
      if (this.shouldLog('debug')) {
        originalConsole.debug(...args)
      }
    }

    // console.info - информационные сообщения
    console.info = (...args) => {
      if (this.shouldLog('info')) {
        originalConsole.info(...args)
      }
    }

    // console.warn - предупреждения
    console.warn = (...args) => {
      if (this.shouldLog('warn')) {
        originalConsole.warn(...args)
      }
    }

    // console.error - обычные и критические ошибки
    console.error = (...args) => {
      if (this.shouldLog('error')) {
        originalConsole.error(...args)
      }
    }
  }

  /**
   * Восстановить оригинальные методы console
   */
  restoreConsole() {
    console.log = originalConsole.log
    console.debug = originalConsole.debug
    console.info = originalConsole.info
    console.warn = originalConsole.warn
    console.error = originalConsole.error
  }

  /**
   * Установить уровень логирования программно
   */
  setLevel(level) {
    if (LOG_LEVELS[level] !== undefined) {
      this.currentLevel = LOG_LEVELS[level]
      // Переопределяем console заново с новым уровнем
      this.overrideConsole()
    }
  }

  /**
   * Получить текущий уровень логирования
   */
  getCurrentLevel() {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.currentLevel)
  }
}

// Создаем singleton экземпляр
const consoleLogger = new ConsoleLogger()

// Автоматически переопределяем console при импорте
consoleLogger.overrideConsole()

// Экспортируем для управления
export const logger = consoleLogger
export { LOG_LEVELS, originalConsole }