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
