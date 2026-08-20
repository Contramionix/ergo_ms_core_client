/**
 * npm pack пакета @ergo-ms/client-shell (git/path dependency на core/client).
 * Артефакт: virtual_env/client-shell/
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { clientProjectRoot } from './lib/parse-disabled-modules.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientRoot = path.resolve(__dirname, '..')
const outDir = path.resolve(clientProjectRoot, 'virtual_env/client-shell')

fs.mkdirSync(outDir, { recursive: true })

const packJson = {
  name: '@ergo-ms/client-shell',
  version: '3.0.0',
  private: false,
  type: 'module',
  description: 'ERGO MS client shell for standalone module SPAs',
  main: 'src/shell/index.js',
  exports: {
    '.': './src/shell/index.js',
    './shell': './src/shell/index.js',
  },
  peerDependencies: {
    vue: '^3.5.34',
    'vue-router': '^5.2.0',
    pinia: '^4.0.0',
    '@vue/devtools-api': '^8.1.5',
    'vue-i18n': '^11.0.0',
  },
}

const staging = path.join(outDir, 'package')
fs.rmSync(staging, { recursive: true, force: true })
fs.mkdirSync(staging, { recursive: true })
fs.writeFileSync(path.join(staging, 'package.json'), `${JSON.stringify(packJson, null, 2)}\n`)

// Копируем исходники shell + необходимые пути через symlink/junction на src
const srcLink = path.join(staging, 'src')
try {
  fs.symlinkSync(path.join(clientRoot, 'src'), srcLink, 'junction')
} catch {
  fs.cpSync(path.join(clientRoot, 'src'), srcLink, { recursive: true })
}

const result = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['pack', '--pack-destination', outDir],
  { cwd: staging, encoding: 'utf8', shell: true },
)

if (result.status !== 0) {
  console.error(result.stdout || '')
  console.error(result.stderr || '')
  console.error('[ERROR] npm pack client-shell не удался')
  process.exit(result.status || 1)
}

console.log(`[OK] @ergo-ms/client-shell упакован в ${outDir}`)
console.log(result.stdout || '')
