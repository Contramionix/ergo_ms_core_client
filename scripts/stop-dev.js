#!/usr/bin/env node

/**
 * Скрипт для остановки Vite dev сервера.
 * Работает на Linux и Windows.
 * 
 * Использование:
 * node scripts/stop-dev.js
 * или через npm: npm run stop-dev
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import process from 'process'

const execAsync = promisify(exec)

/**
 * Получает список процессов, содержащих указанную команду
 * @param {string} command - Команда для поиска
 * @returns {Promise<Array>} Массив объектов с информацией о процессах
 */
async function findProcesses(command) {
  const isWindows = process.platform === 'win32'
  
  try {
    let cmd
    if (isWindows) {
      // На Windows используем wmic для получения полной командной строки
      cmd = `wmic process where "name='node.exe' or CommandLine like '%${command}%'" get ProcessId,CommandLine /format:csv`
    } else {
      // На Linux используем ps с полной командной строкой
      cmd = `ps aux | grep -i "${command}" | grep -v grep`
    }
    
    const { stdout } = await execAsync(cmd)
    const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.startsWith('Node'))
    
    if (lines.length === 0) {
      return []
    }
    
    const processes = []
    
    if (isWindows) {
      // Парсим CSV формат wmic
      // Формат: Node,ProcessId,CommandLine
      for (const line of lines) {
        if (!line || line.startsWith('Node,')) continue
        const parts = line.split(',')
        if (parts.length >= 3) {
          const pid = parseInt(parts[1], 10)
          if (!isNaN(pid)) {
            const cmdline = parts.slice(2).join(',').replace(/"/g, '')
            processes.push({
              name: 'node.exe',
              pid: pid,
              cmdline: cmdline
            })
          }
        }
      }
    } else {
      // Парсим вывод ps aux
      // Формат: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 11) {
          const pid = parseInt(parts[1], 10)
          if (!isNaN(pid)) {
            // Командная строка начинается с 11-го элемента
            const cmdline = parts.slice(10).join(' ')
            processes.push({
              name: parts[10] || '',
              pid: pid,
              cmdline: cmdline
            })
          }
        }
      }
    }
    
    return processes
  } catch (error) {
    // Если команда не нашла процессы, это нормально
    if (error.code === 1 || !error.stdout || error.stdout.trim() === '') {
      return []
    }
    // Если wmic не доступен на Windows, пробуем альтернативный метод
    if (isWindows && error.message.includes('wmic')) {
      return await findProcessesAlternative(command)
    }
    throw error
  }
}

/**
 * Альтернативный метод поиска процессов для Windows (если wmic недоступен)
 * @param {string} command - Команда для поиска
 * @returns {Promise<Array>} Массив объектов с информацией о процессах
 */
async function findProcessesAlternative(command) {
  try {
    // Используем PowerShell для получения процессов с командной строкой
    const cmd = `powershell -Command "Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*${command}*' } | Select-Object ProcessId, CommandLine | ConvertTo-Csv -NoTypeInformation"`
    const { stdout } = await execAsync(cmd)
    const lines = stdout.trim().split('\n').filter(line => line.trim() && !line.startsWith('"ProcessId"'))
    
    const processes = []
    for (const line of lines) {
      // Формат: "1234","полная командная строка"
      const match = line.match(/"(\d+)","([^"]*)"/)
      if (match) {
        processes.push({
          name: 'node.exe',
          pid: parseInt(match[1], 10),
          cmdline: match[2]
        })
      }
    }
    
    return processes
  } catch (error) {
    return []
  }
}

/**
 * Останавливает процесс по PID
 * @param {number} pid - PID процесса
 * @returns {Promise<void>}
 */
async function killProcess(pid) {
  const isWindows = process.platform === 'win32'
  
  try {
    if (isWindows) {
      await execAsync(`taskkill /PID ${pid} /F`)
    } else {
      await execAsync(`kill ${pid}`)
    }
    return true
  } catch (error) {
    console.error(`Ошибка при остановке процесса ${pid}:`, error.message)
    return false
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('Поиск запущенных процессов Vite dev сервера...')
  
  try {
    // Ищем процессы, содержащие vite
    const viteProcesses = await findProcesses('vite')
    
    // Фильтруем только те, которые действительно являются dev сервером
    const devProcesses = viteProcesses.filter(proc => {
      const cmdline = proc.cmdline.toLowerCase()
      // Должен содержать vite и не должен быть build или preview
      const hasVite = cmdline.includes('vite')
      const isBuild = cmdline.includes('vite build') || cmdline.includes('vite-build')
      const isPreview = cmdline.includes('vite preview') || cmdline.includes('vite-preview')
      const isStopScript = cmdline.includes('stop-dev.js') // Исключаем сам скрипт остановки
      
      return hasVite && !isBuild && !isPreview && !isStopScript
    })
    
    if (devProcesses.length === 0) {
      console.log('✓ Vite dev сервер не найден')
      process.exit(0)
    }
    
    console.log(`Найдено процессов: ${devProcesses.length}`)
    
    // Останавливаем все найденные процессы
    let stoppedCount = 0
    for (const proc of devProcesses) {
      console.log(`Остановка процесса ${proc.pid} (${proc.name})...`)
      const success = await killProcess(proc.pid)
      if (success) {
        stoppedCount++
        console.log(`✓ Процесс ${proc.pid} успешно остановлен`)
      }
    }
    
    if (stoppedCount > 0) {
      console.log(`\n✓ Остановлено процессов: ${stoppedCount}`)
      process.exit(0)
    } else {
      console.log('\n✗ Не удалось остановить процессы')
      process.exit(1)
    }
  } catch (error) {
    console.error('Ошибка при остановке dev сервера:', error.message)
    process.exit(1)
  }
}

// Запускаем основную функцию
main()

