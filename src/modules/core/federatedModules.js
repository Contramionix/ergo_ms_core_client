/**
 * Runtime-загрузка federated remotes из CLIENT_MODULE_REMOTES.
 *
 * remoteEntry.js должен экспортировать манифест (default или named `manifest`)
 * либо выставить globalThis.__ERGO_MODULE_REMOTES__[name].
 */

import { clientEnv } from '@/js/clientEnv.js'
import { parseModuleRemotes } from './parseModuleRemotes.js'
import { normalizeClientModuleManifest } from './clientModuleManifest.js'
import { logWarn, logError } from '@/js/utils/logError.js'

function remoteBaseUrl(entryUrl) {
  return String(entryUrl || '').replace(/\/[^/]+$/, '')
}

function addStylesheet(href, datasetId) {
  if (document.querySelector(`link[data-ergo-remote-style="${datasetId}"]`)) {
    return
  }
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.ergoRemoteStyle = datasetId
  document.head.appendChild(link)
}

/**
 * CSS remote-сборки не попадает в JS (lib + cssCodeSplit). Подключаем файлы с того же /remotes/.
 * @param {string} entryUrl
 * @param {string} remoteName
 */
async function injectRemoteStyles(entryUrl, remoteName) {
  const base = remoteBaseUrl(entryUrl)
  if (!base) {
    return
  }
  try {
    const response = await fetch(`${base}/styles.json`, { cache: 'no-store' })
    if (response.ok) {
      const files = await response.json()
      if (Array.isArray(files)) {
        files
          .filter((rel) => typeof rel === 'string' && rel.endsWith('.css'))
          .forEach((rel, index) => {
            const href = rel.startsWith('/')
              ? rel
              : `${base}/${rel.replace(/^\.\//, '')}`
            addStylesheet(href, `${remoteName}-${index}`)
          })
        return
      }
    }
  } catch {
    /* без styles.json стили remote не подключаем — сборка remote пишет этот файл */
  }
}

/**
 * @returns {{ name: string, entry: string }[]}
 */
export function getConfiguredModuleRemotes() {
  return parseModuleRemotes(clientEnv.moduleRemotes || '')
}

/**
 * @param {string} entryUrl
 * @param {string} remoteName
 * @returns {Promise<object|null>}
 */
async function importRemoteEntry(entryUrl, remoteName) {
  try {
    const mod = await import(/* @vite-ignore */ entryUrl)
    if (mod?.default && typeof mod.default === 'object') {
      return mod.default
    }
    if (mod?.manifest && typeof mod.manifest === 'object') {
      return mod.manifest
    }
    if (mod?.moduleKey) {
      return mod
    }
  } catch (error) {
    logWarn(`[federated] ESM import ${remoteName} (${entryUrl}) не удался, пробуем script tag`, error)
  }

  await new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-ergo-remote="${remoteName}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.type = 'module'
    script.src = entryUrl
    script.dataset.ergoRemote = remoteName
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Не удалось загрузить remoteEntry: ${entryUrl}`))
    document.head.appendChild(script)
  })

  const bag = globalThis.__ERGO_MODULE_REMOTES__
  if (bag && typeof bag === 'object' && bag[remoteName]) {
    return bag[remoteName]
  }
  return null
}

/**
 * @returns {Promise<import('./clientModuleManifest.js').ClientModuleManifest[]>}
 */
export async function loadFederatedModules() {
  const remotes = getConfiguredModuleRemotes()
  if (!remotes.length) {
    return []
  }

  const manifests = []
  for (const { name, entry } of remotes) {
    try {
      await injectRemoteStyles(entry, name)
      const raw = await importRemoteEntry(entry, name)
      const manifest = normalizeClientModuleManifest(raw, name)
      if (!manifest) {
        logWarn(`[federated] Remote ${name}: манифест не распознан`)
        continue
      }
      manifests.push(manifest)
    } catch (error) {
      logError(`[federated] Ошибка загрузки remote ${name}`, error)
    }
  }
  return manifests
}
