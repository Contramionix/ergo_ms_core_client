import { fileURLToPath, URL } from 'node:url' // Импорт функций для работы с URL и путями

import vue from '@vitejs/plugin-vue' // Импорт плагина Vue для Vite
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite' // Импорт функции для определения конфигурации Vite
// import vueDevTools from 'vite-plugin-vue-devtools' // Импорт плагина Vue DevTools для Vite

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Получение абсолютного пути к файлу .env в корне проекта
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Алиасы для внешних сабмодулей: @/modules/<name> → <root>/modules/<name>
// Создаются динамически для каждого существующего каталога в modules/.
// Это позволяет файлам внутри сабмодулей импортировать друг друга через @/modules/...
// не конфликтуя с @/modules/index.js и другими файлами core/client/src/modules/.
const modulesRoot = path.resolve(__dirname, '../../modules')
const externalModuleAliases = fs.existsSync(modulesRoot)
  ? fs.readdirSync(modulesRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => ({
        find: `@/modules/${d.name}`,
        replacement: path.join(modulesRoot, d.name),
      }))
  : []

// Загружаем основной .env файл из корня проекта (/projects/ergo_ms/.env)
const mainEnvPath = path.resolve(__dirname, '../../.env')
if (fs.existsSync(mainEnvPath)) {
  dotenv.config({ path: mainEnvPath })
} else {
  console.warn('⚠️  Файл .env не найден в корне проекта:', mainEnvPath)
}


// Определение конфигурации Vite
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      treeshake: {
        preset: 'recommended',
      },
    },
    chunkSizeWarningLimit: 500, // Возвращаем стандартный лимит
  },
  // Подключение плагинов
  plugins: [
    vue(), // Подключение плагина Vue для Vite
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
    //vueDevTools(), // Подключение плагина Vue DevTools для Vite
    {
      // Заглушка для импортов файлов из неинициализированных/частичных сабмодулей.
      //
      // Обрабатывает три случая:
      //  1. ../../../modules/<mod>/...  — относительный путь к несуществующему файлу в modules/
      //  2. @/core/<mod>/...           — алиасный путь к файлу core-сабмодуля (напр. ai-assistant),
      //                                  который ещё не развёрнут в core/client/src/core/
      //
      // Виртуальный ID имеет \0-префикс (стандарт Rollup/esbuild) — благодаря этому
      // esbuild dep-scan не пытается читать его как файл с диска.
      name: 'stub-missing-module-files',
      enforce: 'pre',
      resolveId(source) {
        const srcRoot = path.resolve(__dirname, 'src')

        // @/core/... → файл в core/client/src/core/, но отсутствует.
        // Типичный случай: сабмодуль (ai_assistant и т.п.) не развёрнут в core.
        // Импорты из modules/ через относительные пути обрабатываются через
        // /* @vite-ignore */ в местах использования.
        if (source.startsWith('@/core/')) {
          const filePath = source.slice(2) // убираем '@'
          const resolved = path.join(srcRoot, filePath)
          const exts = ['', '.js', '.vue', '.ts', '.json']
          const exists = exts.some(ext => fs.existsSync(resolved + ext))
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
  ],

  // Настройка разрешения путей
  resolve: {
    alias: [
      // Конкретные алиасы для каждого внешнего сабмодуля идут первыми,
      // чтобы @/modules/<name>/... → modules/<name>/..., а не core/client/src/modules/... через '@'.
      ...externalModuleAliases,
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: 'vue', replacement: 'vue/dist/vue.esm-bundler.js' },
    ],
    // Убеждаемся что Vite правильно обрабатывает расширения файлов
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },

  // Настройка обработки CSS
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @import "@/scss/_mixins.scss"; // Импорт миксинов SCSS
          @import "@/scss/_variables.scss"; // Импорт переменных SCSS
        `,
      },
    },
    devSourcemap: false,
  },

  // Настройка сервера разработки
  server: {
    port: parseInt(process.env.CLIENT_PORT, 10) || 8001, // Установка порта для сервера разработки
    host: process.env.CLIENT_HOST || 'localhost', // Установка хоста для сервера разработки
    https: false, // Отключение HTTPS для сервера разработки
    proxy: {
      '/api': {
        target: `http://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || '8000'}`,
        changeOrigin: true,
      },
    },
    fs: {
      // Разрешаем Vite обслуживать файлы из папки modules вне корня проекта
      allow: [
        // Корень workspace (client)
        '..',
        // Корень проекта (ergo_ms)
        '../..',
      ],
    },
  },


  // Экспорт переменных окружения в клиентский код
  define: {
    'import.meta.env.VITE_API_HOST': JSON.stringify(process.env.API_HOST),
    'import.meta.env.VITE_API_PORT': JSON.stringify(process.env.API_PORT),
    'import.meta.env.VITE_DEFAULT_THEME': JSON.stringify(process.env.VITE_DEFAULT_THEME || 'light'),
    'import.meta.env.VITE_LOG_LEVEL': JSON.stringify(process.env.VITE_LOG_LEVEL || (process.env.CLIENT_DEPLOY_TYPE === 'production' ? 'critical' : 'debug')),
    'import.meta.env.VITE_USE_RELATIVE_API': JSON.stringify(process.env.VITE_USE_RELATIVE_API || ''),
    'import.meta.env.VITE_PASSWORD_MIN_LENGTH': JSON.stringify(process.env.API_PASSWORD_MIN_LENGTH || '8'),
    'import.meta.env.VITE_PASSWORD_MAX_LENGTH': JSON.stringify(process.env.API_PASSWORD_MAX_LENGTH || '128'),
    'import.meta.env.VITE_PASSWORD_REQUIRE_LOWERCASE': JSON.stringify(process.env.API_PASSWORD_REQUIRE_LOWERCASE || 'true'),
    'import.meta.env.VITE_PASSWORD_REQUIRE_UPPERCASE': JSON.stringify(process.env.API_PASSWORD_REQUIRE_UPPERCASE || 'false'),
    'import.meta.env.VITE_PASSWORD_REQUIRE_DIGIT': JSON.stringify(process.env.API_PASSWORD_REQUIRE_DIGIT || 'true'),
    'import.meta.env.VITE_PASSWORD_REQUIRE_SPECIAL': JSON.stringify(process.env.API_PASSWORD_REQUIRE_SPECIAL || 'false'),
  },

  // Оптимизация зависимостей
  optimizeDeps: {
    exclude: ['@vite-ignore', 'vue3-apexcharts'],
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios',
      'bootstrap',
      'exceljs',
      'pdfjs-dist',
    ],
    esbuildOptions: {
      // esbuild-плагин для фазы dep-scan: стаббирует импорты файлов,
      // которые отсутствуют в core/client/src/ (несинициализированные сабмодули).
      // Vite-плагины (resolveId) в эту фазу не применяются, поэтому нужен отдельный плагин.
      plugins: [
        {
          name: 'esbuild-stub-missing-core-imports',
          setup(build) {
            const srcRoot = path.resolve(__dirname, 'src')
            const exts = ['', '.js', '.vue', '.ts', '.json']

            // Перехватываем @/core/... импорты к несуществующим файлам
            build.onResolve({ filter: /^@\/core\// }, (args) => {
              const filePath = args.path.slice(2) // '@' → ''
              const resolved = path.join(srcRoot, filePath)
              const exists = exts.some(ext => fs.existsSync(resolved + ext))
              if (!exists) {
                return { path: args.path, namespace: 'stub-missing' }
              }
            })

            // Перехватываем виртуальный модуль-заглушку (на случай если esbuild его видит)
            build.onResolve({ filter: /virtual:empty-vue-component/ }, (args) => {
              return { path: args.path, namespace: 'stub-missing' }
            })

            build.onLoad({ filter: /.*/, namespace: 'stub-missing' }, () => {
              return {
                contents: 'module.exports = new Proxy({}, { get: function(_, k) { return k === "__esModule" ? true : function(){} } })',
                loader: 'js'
              }
            })
          },
        },
      ],
    },
  },
})