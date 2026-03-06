import { fileURLToPath, URL } from 'node:url' // Импорт функций для работы с URL и путями

import vue from '@vitejs/plugin-vue' // Импорт плагина Vue для Vite
import { defineConfig } from 'vite' // Импорт функции для определения конфигурации Vite
// import vueDevTools from 'vite-plugin-vue-devtools' // Импорт плагина Vue DevTools для Vite

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Получение абсолютного пути к файлу .env в корне проекта
const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
      output: {
        manualChunks: (id) => {
          // Разделяем node_modules на отдельные чанки по основным библиотекам
          if (id.includes('node_modules')) {
            // Разделяем Vue на более мелкие части
            if (id.includes('node_modules/vue/')) {
              return 'vue-core';
            }
            if (id.includes('vue-router')) {
              return 'vue-router';
            }
            if (id.includes('pinia')) {
              return 'pinia';
            }
            
            // Разделяем @vue пакеты более детально
            if (id.includes('@vue/compiler-sfc') || id.includes('@vue/compiler-core')) {
              return 'vue-compiler';
            }
            if (id.includes('@vue/reactivity')) {
              return 'vue-reactivity';
            }
            if (id.includes('@vue/runtime')) {
              return 'vue-runtime';
            }
            if (id.includes('@vue/shared')) {
              return 'vue-shared';
            }
            
            // Остальные Vue библиотеки
            if (id.includes('vue-toastification')) {
              return 'vue-toast';
            }
            if (id.includes('vue-slicksort')) {
              return 'vue-slicksort';
            }
            if (id.includes('vue3-perfect-scrollbar')) {
              return 'vue-scrollbar';
            }
            if (id.includes('v-calendar')) {
              return 'vue-calendar';
            }
            if (id.includes('@vue') || id.includes('vue-')) {
              return 'vue-other';
            }
            
            // Bootstrap и связанные стили
            if (id.includes('bootstrap')) {
              return 'bootstrap-vendor';
            }
            
            // Библиотеки для работы с Excel/таблицами (динамически загружаются)
            if (id.includes('xlsx') || id.includes('exceljs') || id.includes('sheetjs')) {
              return 'excel-vendor';
            }
            
            // Библиотеки для работы с графиками (динамически загружаются)
            if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) {
              return 'apexcharts-vendor';
            }
            if (id.includes('chart.js')) {
              return 'chartjs-vendor';
            }
            if (id.includes('echarts') || id.includes('d3')) {
              return 'charts-vendor';
            }
            
            // Библиотеки для работы с PDF
            if (id.includes('pdf')) {
              return 'pdf-vendor';
            }
            
            // Lucide иконки
            if (id.includes('lucide')) {
              return 'lucide-vendor';
            }
            
            // Axios и API библиотеки
            if (id.includes('axios')) {
              return 'axios-vendor';
            }
            
            // UI библиотеки
            if (id.includes('perfect-scrollbar') || id.includes('formkit')) {
              return 'ui-vendor';
            }
            
            // Все остальные node_modules
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500, // Возвращаем стандартный лимит
  },
  // Подключение плагинов
  plugins: [
    vue(), // Подключение плагина Vue для Vite
    //vueDevTools(), // Подключение плагина Vue DevTools для Vite
  ],

  // Настройка разрешения путей
  resolve: {
    alias: {
      '@/core/ai-assistant': fileURLToPath(new URL('../../modules/ai_assistant/client', import.meta.url)), // AI Assistant frontend submodule
      '@': fileURLToPath(new URL('./src', import.meta.url)), // Создание псевдонима '@' для пути './src'
      '@/modules': fileURLToPath(new URL('../../modules', import.meta.url)), // Алиас для модулей из папки modules/
      'vue': 'vue/dist/vue.esm-bundler.js',
    },
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
    'import.meta.env.VITE_BI_PREVIEW_ROWS_LIMIT': JSON.stringify(process.env.VITE_BI_PREVIEW_ROWS_LIMIT || '1000000000'),
    'import.meta.env.VITE_BI_PREVIEW_MAX_VALUES_ROWS': JSON.stringify(process.env.BI_PREVIEW_MAX_VALUES_ROWS || '1000000000'),
    'import.meta.env.VITE_BI_PREVIEW_MAX_VISIBLE_ROWS': JSON.stringify(process.env.VITE_BI_PREVIEW_MAX_VISIBLE_ROWS || '1000000000'),
    'import.meta.env.VITE_BI_PREVIEW_ITEMS_PER_PAGE': JSON.stringify(process.env.VITE_BI_PREVIEW_ITEMS_PER_PAGE || '20'),
    'import.meta.env.VITE_USE_RELATIVE_API': JSON.stringify(process.env.VITE_USE_RELATIVE_API || ''),
  },

  // Оптимизация сборки
  optimizeDeps: {
    // Исключаем динамически загружаемые модули из предварительной оптимизации
    exclude: ['@vite-ignore', 'vue3-apexcharts'],
    include: [
      'vue',
      'vue-router',
      'pinia',
      'axios',
      'bootstrap',
      'exceljs',
      'epubjs',
      'pdfjs-dist',
    ],
  },
})