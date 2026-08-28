/**
 * Загрузка .env файлов модулей для Vite (логика как на сервере в env.py).
 */

import fs from 'fs'
import path from 'path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const requireFromNpm = createRequire(
  path.join(projectRoot, 'virtual_env/npm/node_modules', '_ergo_resolve.js'),
)

/**
 * Разбор KEY=VALUE как в env_file_loader.py.
 * Нужен, когда node_modules ещё нет: install:all импортирует этот файл до npm install.
 */
export function parseEnvText(content) {
  const result = {}
  const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content)
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim()
    if (!stripped || stripped.startsWith('#') || !stripped.includes('=')) {
      continue
    }
    const eq = stripped.indexOf('=')
    const key = stripped.slice(0, eq).trim()
    if (!key) {
      continue
    }
    let raw = stripped.slice(eq + 1).trim()
    if (
      (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) ||
      (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2)
    ) {
      raw = raw.slice(1, -1)
    }
    result[key] = raw
  }
  return result
}

function loadEnvParser() {
  try {
    const dotenv = requireFromNpm('dotenv')
    return (content) => dotenv.parse(content)
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      return parseEnvText
    }
    throw error
  }
}

export const parseEnv = loadEnvParser()

const FRAGMENT_PRIORITY = [
  'nginx.env',
  'docker.env',
  'jupyter.env',
  'smtp.env',
  'logging.env',
  'mcp.env',
  'media.env',
  'realtime.env',
  'cache.env',
  'celery.env',
]

function parseDisabledModules(baseEnv) {
  const raw = baseEnv.DISABLED_MODULES || ''
  return new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))
}

/**
 * Корневой .env + env/*.env (приоритетные фрагменты, затем остальные по имени).
 */
export function loadProjectEnv(rootDir = projectRoot) {
  const merged = {}
  const mainEnvPath = path.join(rootDir, '.env')
  if (fs.existsSync(mainEnvPath)) {
    Object.assign(merged, parseEnv(fs.readFileSync(mainEnvPath)))
  }

  const fragmentsDir = path.join(rootDir, 'env')
  if (!fs.existsSync(fragmentsDir)) {
    return merged
  }

  const byName = {}
  for (const entry of fs.readdirSync(fragmentsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.env') || entry.name.endsWith('.example')) {
      continue
    }
    byName[entry.name] = path.join(fragmentsDir, entry.name)
  }

  const ordered = []
  for (const name of FRAGMENT_PRIORITY) {
    if (byName[name]) {
      ordered.push(byName[name])
      delete byName[name]
    }
  }
  for (const name of Object.keys(byName).sort()) {
    ordered.push(byName[name])
  }

  for (const filePath of ordered) {
    try {
      Object.assign(merged, parseEnv(fs.readFileSync(filePath)))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Не удалось прочитать фрагмент env/: ${filePath}`, message)
    }
  }
  return merged
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
      const parsed = parseEnv(fs.readFileSync(filePath))
      Object.assign(merged, parsed)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Не удалось прочитать .env модуля: ${filePath}`, message)
    }
  }

  return merged
}
