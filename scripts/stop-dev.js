#!/usr/bin/env node

/**
 * Скрипт для остановки Vite dev сервера.
 * Работает на Linux и Windows.
 *
 * Использование:
 * node scripts/stop-dev.js
 * или через npm: npm run stop-dev
 */

import process from 'process'
import { findProcesses, killProcess } from './lib/process-ops.js'

async function main() {
  console.log('Поиск запущенных процессов Vite dev сервера...')

  try {
    const viteProcesses = await findProcesses('vite')

    const devProcesses = viteProcesses.filter(proc => {
      const cmdline = proc.cmdline.toLowerCase()
      const hasVite = cmdline.includes('vite')
      const isBuild = cmdline.includes('vite build') || cmdline.includes('vite-build')
      const isPreview = cmdline.includes('vite preview') || cmdline.includes('vite-preview')
      const isStopScript = cmdline.includes('stop-dev.js')

      return hasVite && !isBuild && !isPreview && !isStopScript
    })

    if (devProcesses.length === 0) {
      console.log('Vite dev сервер не найден')
      process.exit(0)
    }

    console.log(`Найдено процессов: ${devProcesses.length}`)

    let stoppedCount = 0
    for (const proc of devProcesses) {
      console.log(`Остановка процесса ${proc.pid} (${proc.name})...`)
      const success = await killProcess(proc.pid)
      if (success) {
        stoppedCount++
        console.log(`Процесс ${proc.pid} успешно остановлен`)
      }
    }

    if (stoppedCount > 0) {
      console.log(`\nОстановлено процессов: ${stoppedCount}`)
      process.exit(0)
    } else {
      console.log('\nНе удалось остановить процессы')
      process.exit(1)
    }
  } catch (error) {
    console.error('Ошибка при остановке dev сервера:', error.message)
    process.exit(1)
  }
}

main()
