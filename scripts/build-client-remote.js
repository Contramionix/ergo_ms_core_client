/**
 * Vite-сборка federated remote для modules/<name>/client.
 * Usage: node scripts/build-client-remote.js --module=<name>
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { createRequire, isBuiltin } from 'node:module'
import { loadClientModularityConfig, clientProjectRoot } from './lib/parse-disabled-modules.js'
import {
  ensureFederationEntry,
  removeGeneratedFederationEntry,
} from './lib/generate-federation-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientRoot = path.resolve(__dirname, '..')
const projectRoot = clientProjectRoot
const npmModules = path.resolve(projectRoot, 'virtual_env/npm/node_modules')
const npmRoot = path.resolve(projectRoot, 'virtual_env/npm')
const requireFromNpm = createRequire(path.join(npmModules, '_ergo_resolve.js'))

const moduleArg = process.argv.find((a) => a.startsWith('--module='))
const moduleName = moduleArg ? moduleArg.slice('--module='.length).trim() : ''
if (!moduleName) {
  console.error('[ERROR] Укажите --module=<name>')
  process.exit(1)
}

const moduleClientRoot = path.resolve(projectRoot, 'modules', moduleName, 'client')
if (!fs.existsSync(moduleClientRoot)) {
  console.error(`[ERROR] Нет каталога клиента: ${moduleClientRoot}`)
  process.exit(1)
}
const entryFile = ensureFederationEntry(moduleName, moduleClientRoot)

const { federationShared } = loadClientModularityConfig()
const sharedList = federationShared.length ? federationShared : ['vue', 'vue-router', 'pinia']

const vue = requireFromNpm('@vitejs/plugin-vue')
const { build, defineConfig } = requireFromNpm('vite')

const outDir = path.resolve(projectRoot, 'virtual_env/client-remotes', moduleName)

function resolveFromNpmRootPlugin() {
  const npmImporter = path.join(npmRoot, 'package.json')
  return {
    name: 'resolve-from-npm-root',
    enforce: 'pre',
    async resolveId(id, _importer, options) {
      if (
        !id ||
        id.startsWith('\0') ||
        id.startsWith('.') ||
        id.startsWith('/') ||
        id.startsWith('@/') ||
        path.isAbsolute(id) ||
        isBuiltin(id)
      ) {
        return null
      }
      const bare = id.startsWith('@')
        ? id.split('/').slice(0, 2).join('/')
        : id.split('/')[0]
      if (!bare || !fs.existsSync(path.join(npmModules, bare))) {
        return null
      }
      return this.resolve(id, npmImporter, { ...options, skipSelf: true })
    },
  }
}

const alias = {
  '@': path.resolve(clientRoot, 'src'),
  '@modules': path.resolve(projectRoot, 'modules'),
  [`@/modules/${moduleName}`]: path.resolve(projectRoot, 'modules', moduleName),
  // Не тянуть host ModuleLoader/globs в remote-бандл
  '@/modules/core/sharedGlobs.generated.js': path.resolve(
    __dirname,
    'lib/empty-module.js',
  ),
  '@/modules/core/ModuleLoader.js': path.resolve(__dirname, 'lib/empty-module.js'),
}

const config = defineConfig({
  root: moduleClientRoot,
  plugins: [resolveFromNpmRootPlugin(), vue()],
  resolve: {
    alias: {
      ...alias,
      '@/integrations/ModuleBridge.js': 'ergo-shared/module-bridge',
      '@/integrations/ModuleBridge': 'ergo-shared/module-bridge',
      'vue-toastification': path.resolve(clientRoot, 'src/js/utils/vueToastificationCompat.js'),
      'lucide-vue-next': path.join(npmModules, '@lucide/vue'),
    },
    dedupe: sharedList,
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/scss/_inject.scss"as *;\n`,
        loadPaths: [npmModules],
        quietDeps: true,
        silenceDeprecations: ['import', 'global-builtin', 'color-functions'],
      },
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    lib: {
      entry: entryFile,
      name: `ErgoRemote_${moduleName}`,
      formats: ['es'],
      fileName: () => 'remoteEntry.js',
    },
    rolldownOptions: {
      external: [...sharedList, 'ergo-shared/module-bridge'],
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'chunks/[name]-[hash].js',
        paths: {
          vue: 'vue',
          'vue-router': 'vue-router',
          pinia: 'pinia',
          'ergo-shared/module-bridge': 'ergo-shared/module-bridge',
        },
      },
    },
    target: 'esnext',
    minify: true,
    cssCodeSplit: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})

try {
  await build(config)
} finally {
  if (path.basename(entryFile) === '.federation-entry.generated.js') {
    removeGeneratedFederationEntry(moduleClientRoot)
  }
}
console.log(`[OK] Federated remote собран: ${outDir}/remoteEntry.js`)
console.log(
  `[INFO] CLIENT_MODULE_REMOTES=${moduleName}=/remotes/${moduleName}/remoteEntry.js`,
)
