/**
 * Методы для работы с переменными окружения в клиенте.
 * 
 * Адаптированная версия логики из API для работы в браузере.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Путь к папке configs относительно корня проекта
const CONFIGS_DIR = path.resolve(__dirname, '../../../../configs')

/**
 * Находит все .env файлы в указанной директории и её подпапках.
 * 
 * @param {string} configsDir - Путь к папке configs
 * @returns {Array<{filePath: string, relativePath: string}>} - Список найденных .env файлов
 */
function findEnvFiles(configsDir) {
  const envFiles = []
  const configsPath = path.resolve(configsDir)
  
  if (!fs.existsSync(configsPath)) {
    console.warn(`Папка configs не найдена: ${configsDir}`)
    return envFiles
  }
  
  try {
    // Рекурсивный поиск .env файлов
    const files = getAllFiles(configsPath)
    
    for (const file of files) {
      const fileName = path.basename(file)
      // Ищем файлы с расширением .env, но исключаем .env.example
      if (fileName.startsWith('.env') && !fileName.includes('.example')) {
        const relativePath = path.relative(configsPath, file)
        envFiles.push({
          filePath: file,
          relativePath: relativePath
        })
      }
    }
  } catch (error) {
    console.error(`Ошибка при поиске .env файлов в ${configsDir}:`, error)
  }
  
  return envFiles
}

/**
 * Рекурсивно получает все файлы в директории.
 * 
 * @param {string} dirPath - Путь к директории
 * @returns {Array<string>} - Список путей к файлам
 */
function getAllFiles(dirPath) {
  const files = []
  
  try {
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Рекурсивно ищем в подпапках
        files.push(...getAllFiles(fullPath))
      } else if (stat.isFile()) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Ошибка при чтении директории ${dirPath}:`, error)
  }
  
  return files
}

/**
 * Парсит .env файл и возвращает объект переменных окружения.
 * 
 * @param {string} filePath - Путь к .env файлу
 * @returns {Object<string, string>} - Объект переменных окружения
 */
function parseEnvFile(filePath) {
  const envVars = {}
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum].trim()
      
      // Пропускаем пустые строки и комментарии
      if (!line || line.startsWith('#')) {
        continue
      }
      
      // Проверяем формат KEY=VALUE
      if (line.includes('=')) {
        const equalIndex = line.indexOf('=')
        const key = line.substring(0, equalIndex).trim()
        let value = line.substring(equalIndex + 1).trim()
        
        // Убираем кавычки если есть
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        
        envVars[key] = value
      } else {
        console.warn(`Некорректный формат в ${filePath}:${lineNum + 1}: ${line}`)
      }
    }
  } catch (error) {
    console.error(`Ошибка при чтении файла ${filePath}:`, error)
  }
  
  return envVars
}

/**
 * Объединяет переменные окружения из всех .env файлов.
 * 
 * @param {Array<{filePath: string, relativePath: string}>} envFiles - Список .env файлов
 * @returns {Object<string, {value: string, source: string}>} - Объект с объединёнными переменными
 */
function mergeEnvVariables(envFiles) {
  const mergedVars = {}
  const conflicts = []
  
  for (const { filePath, relativePath } of envFiles) {
    const envVars = parseEnvFile(filePath)
    
    for (const [key, value] of Object.entries(envVars)) {
      if (key in mergedVars) {
        const { value: oldValue, source: oldSource } = mergedVars[key]
        if (oldValue !== value) {
          conflicts.push({
            variable: key,
            oldValue: oldValue,
            oldSource: oldSource,
            newValue: value,
            newSource: relativePath
          })
          console.warn(`Конфликт переменной ${key}: ${oldSource} vs ${relativePath}`)
        }
      }
      
      mergedVars[key] = { value, source: relativePath }
    }
  }
  
  if (conflicts.length > 0) {
    console.warn(`⚠️  Найдено ${conflicts.length} конфликтов переменных окружения!`)
    console.warn('='.repeat(60))
    conflicts.forEach((conflict, i) => {
      console.warn(`Конфликт #${i + 1}: ${conflict.variable}`)
      console.warn(`  📁 ${conflict.oldSource}: '${conflict.oldValue}'`)
      console.warn(`  📁 ${conflict.newSource}: '${conflict.newValue}'`)
      console.warn(`  ✅ Используется значение из: ${conflict.newSource}`)
      console.warn('-'.repeat(40))
    })
    console.warn('='.repeat(60))
  }
  
  return mergedVars
}

/**
 * Собирает все .env файлы из папки configs и возвращает объединённый объект переменных.
 * 
 * @returns {Object<string, string>} - Объект переменных окружения {ключ: значение}
 */
export function collectEnvFilesFromConfigs() {
  try {
    const envFiles = findEnvFiles(CONFIGS_DIR)
    
    if (envFiles.length === 0) {
      console.warn('Не найдено ни одного .env файла в папке configs')
      return {}
    }
    
    console.log(`Найдено ${envFiles.length} .env файлов в папке configs:`)
    envFiles.forEach(({ relativePath }) => {
      console.log(`  - ${relativePath}`)
    })
    
    // Объединяем переменные
    const mergedVars = mergeEnvVariables(envFiles)
    
    if (Object.keys(mergedVars).length === 0) {
      console.warn('Не найдено ни одной переменной окружения')
      return {}
    }
    
    // Преобразуем в простой объект {ключ: значение}
    const envDict = {}
    for (const [key, { value }] of Object.entries(mergedVars)) {
      envDict[key] = value
    }
    
    console.log(`Загружено ${Object.keys(envDict).length} переменных окружения из configs`)
    
    return envDict
    
  } catch (error) {
    console.error('Ошибка при сборе .env файлов из configs:', error)
    return {}
  }
}

/**
 * Возвращает информацию о том, из каких файлов взяты переменные окружения.
 * 
 * @returns {Object<string, Array<string>>} - Объект {источник: [переменные]}
 */
export function getEnvSources() {
  try {
    const envFiles = findEnvFiles(CONFIGS_DIR)
    const sources = {}
    
    for (const { filePath, relativePath } of envFiles) {
      const envVars = parseEnvFile(filePath)
      sources[relativePath] = Object.keys(envVars)
    }
    
    return sources
  } catch (error) {
    console.error('Ошибка при получении источников переменных окружения:', error)
    return {}
  }
}
