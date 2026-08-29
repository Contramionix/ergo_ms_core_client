import { defineConfig } from '@playwright/test'

const baseURL = process.env.ERGO_E2E_BASE_URL || 'http://127.0.0.1:8001'

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  outputDir: '../../../virtual_env/cache/tmp/system-test/playwright-output',
  use: {
    baseURL,
    browserName: 'chromium',
    locale: 'ru-RU',
  },
})
