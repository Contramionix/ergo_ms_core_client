import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Эталонный vite.config для внешнего репо модуля.
 * Скопируйте в новый репозиторий и укажите путь к shell (git/file dependency).
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Во внешнем репо: '@standalone-module-manifest': path.resolve(__dirname, 'src/module/manifest.js')
      '@standalone-module-manifest': path.resolve(__dirname, 'src/module/manifest.js'),
    },
    dedupe: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
  },
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
