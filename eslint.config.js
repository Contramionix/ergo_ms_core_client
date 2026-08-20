/**
 * Flat ESLint config. Зависимости в virtual_env/npm/node_modules
 * (не предок core/client) — грузим через createRequire от npm-root.
 * basePath = корень репозитория, чтобы lint:check видел clients модулей.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(clientRoot, '../..')
const npmRoot = path.resolve(projectRoot, 'virtual_env/npm')
const requireFromNpm = createRequire(path.join(npmRoot, 'package.json'))

const { defineConfig } = requireFromNpm('eslint/config')
const js = requireFromNpm('@eslint/js')
const globals = requireFromNpm('globals')
const skipFormatting = requireFromNpm('@vue/eslint-config-prettier/skip-formatting')
const pluginVue = requireFromNpm('eslint-plugin-vue')
const pluginVueA11y = requireFromNpm('eslint-plugin-vuejs-accessibility')

const autoImportGlobalsPath = path.join(clientRoot, '.eslintrc-auto-import.json')
const autoImportGlobals = JSON.parse(fs.readFileSync(autoImportGlobalsPath, 'utf8')).globals ?? {}

const clientFiles = [
  'core/client/**/*.{js,mjs,jsx,vue}',
  'modules/*/client/**/*.{js,mjs,jsx,vue}',
]
const vueFiles = ['core/client/**/*.vue', 'modules/*/client/**/*.vue']

export default defineConfig({
  basePath: projectRoot,
  extends: [
    {
      name: 'app/files-to-ignore',
      ignores: [
        '**/dist/**',
        '**/dist-ssr/**',
        '**/coverage/**',
        '**/node_modules/**',
        'virtual_env/**',
      ],
    },

    {
      name: 'app/language-options',
      files: clientFiles,
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: {
          ...globals.browser,
          ...globals.node,
          ...autoImportGlobals,
        },
      },
    },

    {
      name: 'app/js-recommended',
      files: clientFiles,
      ...js.configs.recommended,
    },

    ...pluginVue.configs['flat/essential'].map((block) => ({
      ...block,
      files: block.files ?? vueFiles,
    })),

    ...pluginVueA11y.configs['flat/recommended'].map((block) => ({
      ...block,
      files: block.files ?? vueFiles,
    })),

    {
      name: 'app/a11y-overrides',
      files: vueFiles,
      rules: {
        'vuejs-accessibility/label-has-for': 'warn',
        'vuejs-accessibility/form-control-has-label': 'warn',
        'vuejs-accessibility/mouse-events-have-key-events': 'warn',
        'vuejs-accessibility/click-events-have-key-events': 'warn',
        'vuejs-accessibility/interactive-supports-focus': 'warn',
        'vuejs-accessibility/no-static-element-interactions': 'warn',
        'vuejs-accessibility/alt-text': 'error',
        'vuejs-accessibility/anchor-has-content': 'error',
        'vuejs-accessibility/heading-has-content': 'error',
        'vuejs-accessibility/no-redundant-roles': 'error',
      },
    },
    {
      name: 'app/vue-name-overrides',
      files: vueFiles,
      rules: {
        'vue/multi-word-component-names': 'off',
      },
    },
    {
      name: 'app/js-overrides',
      files: clientFiles,
      rules: {
        'no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
        // ESLint 10 recommended: в кодовой базе ещё есть срабатывания, не валим lint:check.
        'no-useless-assignment': 'warn',
        'preserve-caught-error': 'warn',
      },
    },
    {
      ...skipFormatting,
      files: clientFiles,
    },
  ],
})
