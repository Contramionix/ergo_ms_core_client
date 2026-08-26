/**
 * Парсинг DISABLED_MODULES / CLIENT_MODULES / CLIENT_MODULARITY
 * из корневого .env и env/*.env (фрагменты, как loadProjectEnv).
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { loadProjectEnv, parseEnv } from './module-env.js'

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
 * @param {string} [raw]
 * @returns {string[]}
 */
export function parseCsvList(raw = '') {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * @param {Record<string, string>} [env]
 * @returns {{ modularity: string, disabled: Set<string>, allowlist: string[]|null, remotesRaw: string, federationShared: string[] }}
 */
export function parseClientModularityConfig(env = {}) {
  const modularity = String(env.CLIENT_MODULARITY || 'bundled').trim().toLowerCase() || 'bundled'
  const disabled = parseDisabledModulesFromRaw(env.DISABLED_MODULES)
  const allowRaw = String(env.CLIENT_MODULES || '').trim()
  const allowlist = allowRaw ? parseCsvList(allowRaw) : null
  const remotesRaw = String(env.CLIENT_MODULE_REMOTES || '').trim()
  const federationShared = parseCsvList(
    env.CLIENT_FEDERATION_SHARED || 'vue,vue-router,pinia',
  )
  return { modularity, disabled, allowlist, remotesRaw, federationShared }
}

/**
 * Сливает .env + env/*.env; опционально один файл перекрывает DISABLED_MODULES.
 * @param {string} [envPath]
 * @returns {Record<string, string>}
 */
export function loadMergedClientEnv(envPath = path.join(projectRoot, '.env')) {
  const merged = { ...loadProjectEnv(projectRoot) }
  if (envPath && fs.existsSync(envPath)) {
    Object.assign(merged, parseEnv(fs.readFileSync(envPath)))
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && value !== '') {
      merged[key] = value
    }
  }
  return merged
}

/**
 * @param {string} [envPath]
 * @returns {Set<string>}
 */
export function loadDisabledModules(envPath = path.join(projectRoot, '.env')) {
  const env = loadMergedClientEnv(envPath)
  return parseDisabledModulesFromRaw(env.DISABLED_MODULES)
}

/**
 * @param {string} [envPath]
 */
export function loadClientModularityConfig(envPath = path.join(projectRoot, '.env')) {
  return parseClientModularityConfig(loadMergedClientEnv(envPath))
}

/**
 * name=url,name2=url2 → [{ name, entry }]
 * @param {string} [raw]
 * @returns {{ name: string, entry: string }[]}
 */
export function parseModuleRemotes(raw = '') {
  const items = []
  for (const part of parseCsvList(raw)) {
    const eq = part.indexOf('=')
    if (eq <= 0) continue
    const name = part.slice(0, eq).trim()
    const entry = part.slice(eq + 1).trim()
    if (name && entry) {
      items.push({ name, entry })
    }
  }
  return items
}

/**
 * @param {string} modulesRoot
 * @param {Set<string>} disabledModules
 * @param {string[]|null} [allowlist] — null = все кроме disabled
 * @returns {string[]}
 */
export function listEnabledModuleNames(modulesRoot, disabledModules, allowlist = null) {
  if (!fs.existsSync(modulesRoot)) {
    return []
  }

  const allow = allowlist && allowlist.length
    ? new Set(allowlist)
    : null

  return fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !disabledModules.has(name))
    .filter((name) => !allow || allow.has(name))
    .filter((name) => {
      const moduleDir = path.join(modulesRoot, name)
      return (
        fs.existsSync(path.join(moduleDir, 'client')) ||
        fs.existsSync(path.join(moduleDir, 'api'))
      )
    })
    .sort()
}

export { projectRoot as clientProjectRoot }
