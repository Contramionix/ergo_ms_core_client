import { fileURLToPath, URL } from 'node:url'
import path from 'path'
import fs from 'fs'
import { createRequire, isBuiltin } from 'node:module'
import { loadProjectEnv, mergeModuleEnv } from './scripts/lib/module-env.js'
import { loadDisabledModules } from './scripts/lib/parse-disabled-modules.js'

const require = createRequire(import.meta.url)
const { applyNginxClientEnv, nginxEnabled } = require('../deployment/nginx/nginx-env.cjs')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const analyzeBuild = process.env.ANALYZE === 'true'
const projectRoot = path.resolve(__dirname, '../..')
const npmModules = path.resolve(projectRoot, 'virtual_env/npm/node_modules')
const npmRoot = path.resolve(projectRoot, 'virtual_env/npm')
// Пакеты только в virtual_env/npm — ESM import из core/client их не находит (Node walk-up).
const requireFromNpm = createRequire(path.join(npmModules, '_ergo_resolve.js'))
const vue = requireFromNpm('@vitejs/plugin-vue')
const AutoImport = requireFromNpm('unplugin-auto-import/vite')
const { defineConfig } = requireFromNpm('vite')
const { visualizer } = requireFromNpm('rollup-plugin-visualizer')

/** Пакеты лежат в virtual_env/npm/node_modules (не предок core/client). */
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
        id.startsWith('@modules/') ||
        path.isAbsolute(id) ||
        id === 'vue' ||
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
      // Vite resolve из npm-root — корректные package exports (browser)
      const resolved = await this.resolve(id, npmImporter, { ...options, skipSelf: true })
      if (resolved) {
        return resolved
      }
      // CSS/@import и прочие пути, которые default resolve не поднял
      try {
        const abs = requireFromNpm.resolve(id)
        if (abs && abs !== id && !isBuiltin(abs) && fs.existsSync(abs)) {
          return abs
        }
      } catch {
        /* пакет есть, но субпуть не резолвится через require */
      }
      return null
    },
  }
}

const modulesRoot = path.resolve(__dirname, '../../modules')
const disabledModules = loadDisabledModules()

const externalModuleAliases = fs.existsSync(modulesRoot)
  ? fs.readdirSync(modulesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .filter((d) => !disabledModules.has(d.name))
      .map((d) => ({
        find: `@/modules/${d.name}`,
        replacement: path.join(modulesRoot, d.name),
      }))
  : []

const projectEnv = loadProjectEnv(path.resolve(__dirname, '../..'))
if (Object.keys(projectEnv).length === 0) {
  console.warn('Файл .env / env/*.env не найдены в корне проекта')
} else {
  for (const [key, value] of Object.entries(projectEnv)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value
    }
  }
}

const env = mergeModuleEnv(modulesRoot, process.env)
const runtimeEnv = applyNginxClientEnv(env)

/** Runtime-статус для SPA; gitignore — создаём OFF по умолчанию, чтобы не было 404. */
function ensureMaintenanceJson() {
  const filePath = path.resolve(__dirname, 'public/maintenance.json')
  if (fs.existsSync(filePath)) {
    return
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(
    filePath,
    `${JSON.stringify({ maintenance: false, pollIntervalMs: 3000 }, null, 2)}\n`,
    'utf8',
  )
}

ensureMaintenanceJson()

/**
 * optimizeDeps.include резолвит пакеты от корня Vite (core/client), а не через плагин.
 * Пакеты лежат только в virtual_env/npm — без alias Vite пишет Failed to resolve dependency.
 */
const OPTIMIZE_DEPS_INCLUDE = [
  'vue',
  'vue-router',
  'pinia',
  'axios',
  'exceljs',
  'pdfjs-dist',
]

function npmPackageAliases(names) {
  return names.map((name) => ({
    find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
    replacement: path.join(npmModules, name),
  }))
}

/** Bind-адреса сервера — браузер по ним не ходит (ERR_ADDRESS_INVALID). */
const BIND_ALL_HOSTS = new Set(['0.0.0.0', '*', '::', '[::]'])

function resolvePollIntervalMs(serverKey, defaultMs) {
  const serverValue = runtimeEnv[serverKey]
  if (serverValue !== undefined && serverValue !== '') {
    const seconds = Number.parseInt(String(serverValue), 10)
    if (Number.isFinite(seconds) && seconds > 0) {
      return String(seconds * 1000)
    }
  }
  return String(defaultMs)
}

/**
 * Хост API для запросов из браузера.
 * API_HOST=0.0.0.0 в Docker — только bind; для SPA нужен localhost / CLIENT_API_HOST.
 */
function resolveBrowserApiHost(envValues) {
  const explicit = String(envValues.CLIENT_API_HOST || '').trim()
  if (explicit && !BIND_ALL_HOSTS.has(explicit)) {
    return explicit
  }
  const host = String(envValues.API_HOST || 'localhost').trim() || 'localhost'
  if (BIND_ALL_HOSTS.has(host)) {
    return 'localhost'
  }
  return host
}

/**
 * Upstream для Vite proxy /api и /ws.
 * В Docker при bind 0.0.0.0 — имя сервиса compose; на хосте — loopback.
 */
function resolveApiProxyHost(envValues) {
  const host = String(envValues.API_HOST || 'localhost').trim() || 'localhost'
  if (!BIND_ALL_HOSTS.has(host)) {
    return host
  }
  if (envValues.DOCKER_ENABLED === 'true' || envValues.ERGO_DOCKER_SERVICE_API) {
    return String(
      envValues.ERGO_DOCKER_SERVICE_API
      || envValues.DOCKER_SERVICE_API
      || 'api',
    ).trim() || 'api'
  }
  return '127.0.0.1'
}

function resolveDeployType(envValues) {
  const raw = String(
    envValues.CLIENT_DEPLOY_TYPE || envValues.ERGO_ENV || 'development',
  ).toLowerCase()
  if (raw === 'prod' || raw === 'production') {
    return 'production'
  }
  return 'development'
}

function resolveUseRelativeApi(envValues) {
  const explicit = envValues.CLIENT_USE_RELATIVE_API
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') {
    return String(explicit).trim()
  }
  // ERGO_PROXY=nginx / NGINX_ENABLED — тот же origin, что SPA
  return nginxEnabled(envValues) ? 'true' : 'false'
}

function buildClientEnvDefines(envValues) {
  const useRelativeApi = resolveUseRelativeApi(envValues)
  const logLevel = envValues.CLIENT_LOG_LEVEL
    || (resolveDeployType(envValues) === 'production' ? 'critical' : 'debug')

  const coreValues = {
    CLIENT_API_HOST: resolveBrowserApiHost(envValues),
    CLIENT_API_PORT: envValues.API_PORT || '8000',
    CLIENT_USE_RELATIVE_API: useRelativeApi,
    CLIENT_DEFAULT_LANGUAGE:
      envValues.CLIENT_DEFAULT_LANGUAGE || envValues.DEFAULT_LANGUAGE || 'ru',
    CLIENT_LOG_LEVEL: logLevel,
    CLIENT_BROWSER_LOG_ENABLED: envValues.CLIENT_BROWSER_LOG_ENABLED ?? 'true',
    CLIENT_MONITORING_ENABLED: envValues.CLIENT_MONITORING_ENABLED ?? 'false',

    CLIENT_DISABLED_MODULES: envValues.DISABLED_MODULES || '',
    CLIENT_PASSWORD_MIN_LENGTH: envValues.API_PASSWORD_MIN_LENGTH || '8',
    CLIENT_PASSWORD_MAX_LENGTH: envValues.API_PASSWORD_MAX_LENGTH || '128',
    CLIENT_PASSWORD_REQUIRE_LOWERCASE: envValues.API_PASSWORD_REQUIRE_LOWERCASE ?? 'true',
    CLIENT_PASSWORD_REQUIRE_UPPERCASE: envValues.API_PASSWORD_REQUIRE_UPPERCASE ?? 'false',
    CLIENT_PASSWORD_REQUIRE_DIGIT: envValues.API_PASSWORD_REQUIRE_DIGIT ?? 'true',
    CLIENT_PASSWORD_REQUIRE_SPECIAL: envValues.API_PASSWORD_REQUIRE_SPECIAL ?? 'false',
    CLIENT_REALTIME_TRANSPORT:
      envValues.REALTIME_TRANSPORT || envValues.ERGO_REALTIME || 'websocket',
    CLIENT_REALTIME_POLL_PRESENCE_INTERVAL: resolvePollIntervalMs('REALTIME_POLL_PRESENCE_INTERVAL', 45000),
    CLIENT_REALTIME_POLL_NOTIFICATIONS_INTERVAL: resolvePollIntervalMs('REALTIME_POLL_NOTIFICATIONS_INTERVAL', 15000),
    CLIENT_REALTIME_POLL_ADMIN_PRESENCE_INTERVAL: resolvePollIntervalMs('REALTIME_POLL_ADMIN_PRESENCE_INTERVAL', 10000),
    CLIENT_REALTIME_POLL_MESSENGER_INTERVAL: resolvePollIntervalMs('REALTIME_POLL_MESSENGER_INTERVAL', 5000),
    CLIENT_SYSTEM_VERSION: envValues.VERSION || '2.7.8',
  }

  const values = { ...coreValues }
  for (const [key, value] of Object.entries(envValues)) {
    if (!key.startsWith('CLIENT_') || key in coreValues) {
      continue
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      values[key] = value
    }
  }

  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(String(value ?? '')),
    ]),
  )
}

const CORE_MODULE_SYSTEM = '/core/client/src/modules/'

/** Внешние модули без static import из других modules/* — отдельный чанк безопасен. */
function loadStandaloneModuleChunks(envValues) {
  const raw = String(envValues.CLIENT_STANDALONE_MODULE_CHUNKS || '').trim()
  if (!raw) {
    return new Set()
  }
  return new Set(
    raw
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  )
}

const STANDALONE_MODULE_CHUNKS = loadStandaloneModuleChunks(runtimeEnv)

function resolveManualChunk(id) {
  const normalizedId = id.replace(/\\/g, '/')

  if (!normalizedId.includes('node_modules')) {
    // Модульные endpoints.js и ядровой proxy — один чанк, иначе в production
    // module_* получают вторую копию endpoints без initEndpoints() (см. datasetService.js).
    if (
      /\/js\/endpoints\.js$/.test(normalizedId)
      || /\/js\/api\/endpoints\.js$/.test(normalizedId)
    ) {
      return 'module_endpoints'
    }

    // ModuleLoader, RouteManager и т.п. — не module_api / module_core (ложное совпадение пути).
    if (normalizedId.includes(CORE_MODULE_SYSTEM)) {
      return 'module_runtime'
    }

    const moduleMatch = normalizedId.match(/\/modules\/([^/]+)\//)
    if (moduleMatch && /\.(vue|[mc]?js|tsx?)$/.test(normalizedId)) {
      const moduleName = moduleMatch[1]
      if (STANDALONE_MODULE_CHUNKS.has(moduleName)) {
        return `module_${moduleName.replace(/-/g, '_')}`
      }
      // Остальные модули с cross-import — без принудительного чанка
      return undefined
    }
    return undefined
  }

  if (
    normalizedId.includes('echarts')
    || normalizedId.includes('vue-echarts')
    || normalizedId.includes('zrender')
  ) {
    return 'vendor_echarts'
  }
  if (
    normalizedId.includes('apexcharts')
    || normalizedId.includes('vue3-apexcharts')
    || normalizedId.includes('chart.js')
  ) {
    return 'vendor_charts'
  }
  if (normalizedId.includes('codemirror') || normalizedId.includes('vue-codemirror')) {
    return 'vendor_editors'
  }
  if (normalizedId.includes('exceljs') || normalizedId.includes('pdfjs-dist')) {
    return 'vendor_heavy'
  }
  if (normalizedId.includes('epubjs')) {
    return 'vendor_epub'
  }
  if (normalizedId.includes('@vuepic/vue-datepicker')) {
    return 'vendor_datepicker'
  }
  // lucide: не форсируем один vendor_lucide — иначе barrel+все named icons
  // склеиваются в ~900KB; menu грузит icons/*.js точечно через lucideIconLoader.
  if (normalizedId.includes('axios')) {
    return 'vendor_axios'
  }
  if (
    normalizedId.includes('/vue-router/')
    || normalizedId.includes('/pinia/')
    || (normalizedId.includes('/vue/') && !normalizedId.includes('lucide-vue-next'))
    || normalizedId.includes('/@vue/')
  ) {
    return 'vendor_vue'
  }
  if (normalizedId.includes('bootstrap') || normalizedId.includes('vue-toastification')) {
    return 'vendor_ui'
  }

  return undefined
}

/**
 * Blocking classic script до module-бандла.
 * Build: raw asset с content-hash в /assets/ (immutable).
 * Dev: middleware на /js/bootstrap-early.js из src (без HMR-обёртки).
 */
function bootstrapEarlyAssetPlugin() {
  const earlySrc = path.resolve(__dirname, 'src/js/bootstrap-early.js')
  const devUrl = '/js/bootstrap-early.js'
  // Комментарий вместо <script>: Vite не ругается на classic script без type="module"
  const placeholderRe = /<!--\s*ergo-bootstrap-early\s*-->/
  let isBuild = false

  return {
    name: 'bootstrap-early-asset',
    configResolved(config) {
      // emitFile только в build; в serve Vite его не поддерживает
      isBuild = config.command === 'build'
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== devUrl) {
          next()
          return
        }
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(fs.readFileSync(earlySrc, 'utf8'))
      })
    },
    buildStart() {
      if (!isBuild) {
        return
      }
      this.emitFile({
        type: 'asset',
        name: 'bootstrap-early.js',
        source: fs.readFileSync(earlySrc, 'utf8'),
      })
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!placeholderRe.test(html)) {
          throw new Error('bootstrap-early: в index.html нет <!-- ergo-bootstrap-early -->')
        }
        let src = devUrl
        if (!ctx.server) {
          const asset = ctx.bundle
            ? Object.values(ctx.bundle).find(
              (chunk) => chunk.type === 'asset' && chunk.name === 'bootstrap-early.js',
            )
            : null
          if (!asset?.fileName) {
            throw new Error('bootstrap-early: hashed asset не найден в bundle')
          }
          src = asset.fileName.startsWith('/') ? asset.fileName : `/${asset.fileName}`
        }
        return html.replace(placeholderRe, `<script src="${src}"></script>`)
      },
    },
  }
}

const plugins = [
  resolveFromNpmRootPlugin(),
  bootstrapEarlyAssetPlugin(),
  vue(),
  AutoImport({
    imports: [
      {
        '@/js/utils/logError.js': ['logError', 'logWarn', 'sanitizeError'],
      },
    ],
    dts: 'src/auto-imports.d.ts',
    eslintrc: {
      enabled: true,
      filepath: './.eslintrc-auto-import.json',
    },
  }),
  {
    name: 'stub-missing-module-files',
    enforce: 'pre',
    resolveId(source) {
      const srcRoot = path.resolve(__dirname, 'src')

      if (source.startsWith('@/core/')) {
        const filePath = source.slice(2)
        const resolved = path.join(srcRoot, filePath)
        const exts = ['', '.js', '.vue', '.ts', '.json']
        const exists = exts.some((ext) => fs.existsSync(resolved + ext))
        if (!exists) {
          return '\0virtual:empty-vue-component'
        }
      }
    },
    load(id) {
      if (id === '\0virtual:empty-vue-component') {
        return `import { defineComponent } from 'vue'; export default defineComponent({ render() {} })`
      }
    },
  },
]

if (analyzeBuild) {
  plugins.push(
    visualizer({
      filename: path.resolve(__dirname, 'dist/stats.html'),
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  )
}

export default defineConfig(() => ({
  build: {
    // Согласовано с browserslist: последние 2 версии современных браузеров (без IE)
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      treeshake: {
        preset: 'recommended',
      },
      output: {
        manualChunks(id) {
          return resolveManualChunk(id)
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  plugins,
  resolve: {
    alias: [
      ...externalModuleAliases,
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      {
        find: /^vue$/,
        replacement: path.join(npmModules, 'vue/dist/vue.esm-bundler.js'),
      },
      // vue уже выше (ESM-бандл); остальные — для optimizeDeps.include
      ...npmPackageAliases(OPTIMIZE_DEPS_INCLUDE.filter((name) => name !== 'vue')),
    ],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    modules: [npmModules, 'node_modules'],
  },

  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/scss/_inject.scss"as *;\n`,
        loadPaths: [npmModules],
      },
    },
    devSourcemap: false,
  },
  server: {
    port: parseInt(process.env.CLIENT_PORT, 10) || 8001,
    host: process.env.CLIENT_HOST || 'localhost',
    https: false,
    // Прокси для CLIENT_USE_RELATIVE_API=true без nginx (редко) и ручных запросов к /api на origin Vite.
    proxy: {
      '/api': {
        target: `http://${resolveApiProxyHost(runtimeEnv)}:${runtimeEnv.API_PORT || '8000'}`,
        changeOrigin: true,
      },
      '/ws': {
        target: `http://${resolveApiProxyHost(runtimeEnv)}:${runtimeEnv.API_PORT || '8000'}`,
        ws: true,
        changeOrigin: true,
      },
    },
    fs: {
      allow: [
        '..',
        '../..',
        npmRoot,
        npmModules,
      ],
    },
  },
  define: buildClientEnvDefines(runtimeEnv),
  optimizeDeps: {
    exclude: ['@vite-ignore', 'vue3-apexcharts'],
    include: OPTIMIZE_DEPS_INCLUDE,
    esbuildOptions: {
      plugins: [
        {
          name: 'esbuild-stub-missing-core-imports',
          setup(build) {
            const srcRoot = path.resolve(__dirname, 'src')
            const exts = ['', '.js', '.vue', '.ts', '.json']

            build.onResolve({ filter: /^@\/core\// }, (args) => {
              const filePath = args.path.slice(2)
              const resolved = path.join(srcRoot, filePath)
              const exists = exts.some((ext) => fs.existsSync(resolved + ext))
              if (!exists) {
                return { path: args.path, namespace: 'stub-missing' }
              }
            })

            build.onResolve({ filter: /virtual:empty-vue-component/ }, (args) => {
              return { path: args.path, namespace: 'stub-missing' }
            })

            build.onLoad({ filter: /.*/, namespace: 'stub-missing' }, () => {
              return {
                contents: 'module.exports = new Proxy({}, { get: function(_, k) { return k === "__esModule" ? true : function(){} } })',
                loader: 'js',
              }
            })
          },
        },
      ],
    },
  },
}))
