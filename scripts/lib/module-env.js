/**
 * Загрузка .env файлов модулей для Vite (логика как на сервере в env.py).
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

function parseDisabledModules(baseEnv) {
  const raw = baseEnv.DISABLED_MODULES || ''
  return new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))
}

function isModuleEnvFile(fileName) {
  if (!fileName.startsWith('.env')) {
    return false
  }
  if (fileName.endsWith('.env.example')) {
    return false
  }
  return fileName === '.env' || fileName.startsWith('.env.')
}

function findModuleEnvFiles(modulesRoot, disabledModules) {
  const files = []
  if (!fs.existsSync(modulesRoot)) {
    return files
  }

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (!isModuleEnvFile(entry.name)) {
        continue
      }
      const relative = path.relative(modulesRoot, fullPath)
      const moduleName = relative.split(path.sep)[0]
      if (disabledModules.has(moduleName)) {
        continue
      }
      files.push(fullPath)
    }
  }

  walk(modulesRoot)
  return files.sort()
}

/**
 * Объединяет корневой env с переменными из .env файлов в каталоге modules (модули переопределяют корень).
 */
export function mergeModuleEnv(modulesRoot, baseEnv) {
  const merged = { ...baseEnv }
  const disabledModules = parseDisabledModules(baseEnv)
  const envFiles = findModuleEnvFiles(modulesRoot, disabledModules)

  for (const filePath of envFiles) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(filePath))
      Object.assign(merged, parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`⚠️  Не удалось прочитать .env модуля: ${filePath}`, message)
    }
  }

  return merged
}
