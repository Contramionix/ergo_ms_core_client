import { fileURLToPath, URL } from 'node:url' // Импорт функций для работы с URL и путями

import vue from '@vitejs/plugin-vue' // Импорт плагина Vue для Vite
import { defineConfig } from 'vite' // Импорт функции для определения конфигурации Vite
import vueDevTools from 'vite-plugin-vue-devtools' // Импорт плагина Vue DevTools для Vite

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
  // Подключение плагинов
  plugins: [
    vue(), // Подключение плагина Vue для Vite
    //vueDevTools(), // Подключение плагина Vue DevTools для Vite
  ],

  // Настройка разрешения путей
  resolve: {
    alias: {
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
  },

  // Настройка сервера разработки
  server: {
    port: parseInt(process.env.CLIENT_PORT, 10) || 8001, // Установка порта для сервера разработки
    host: process.env.CLIENT_HOST || 'localhost', // Установка хоста для сервера разработки
    https: false, // Отключение HTTPS для сервера разработки
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
  },

  // Оптимизация сборки
  optimizeDeps: {
    // Исключаем динамически загружаемые модули из предварительной оптимизации
    exclude: ['@vite-ignore'],
  },
})
