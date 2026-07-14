/**
 * Парсинг DISABLED_MODULES из корневого .env (логика как в module-env.js).
 */

import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../../../..')

/**
 * @param {string} [raw]
 * @returns {Set<string>}
 */
export function parseDisabledModulesFromRaw(raw = '') {
  return new Set(
    String(raw || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

/**
 * @param {string} [envPath]
 * @returns {Set<string>}
 */
export function loadDisabledModules(envPath = path.join(projectRoot, '.env')) {
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath))
    return parseDisabledModulesFromRaw(parsed.DISABLED_MODULES)
  }
  return parseDisabledModulesFromRaw(process.env.DISABLED_MODULES)
}

/**
 * @param {string} modulesRoot
 * @param {Set<string>} disabledModules
 * @returns {string[]}
 */
export function listEnabledModuleNames(modulesRoot, disabledModules) {
  if (!fs.existsSync(modulesRoot)) {
    return []
  }

  return fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !disabledModules.has(name))
    .filter((name) => fs.existsSync(path.join(modulesRoot, name, 'client')))
    .sort()
}

export { projectRoot as clientProjectRoot }
