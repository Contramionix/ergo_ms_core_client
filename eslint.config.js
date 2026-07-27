/**
 * Flat ESLint config. Зависимости в virtual_env/npm/node_modules
 * (не предок core/client) — грузим через createRequire от npm-root.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const npmRoot = path.resolve(clientRoot, '../../virtual_env/npm')
const requireFromNpm = createRequire(path.join(npmRoot, 'package.json'))

const js = requireFromNpm('@eslint/js')
const globals = requireFromNpm('globals')
const skipFormatting = requireFromNpm('@vue/eslint-config-prettier/skip-formatting')
const pluginVue = requireFromNpm('eslint-plugin-vue')
const pluginVueA11y = requireFromNpm('eslint-plugin-vuejs-accessibility')

const autoImportGlobalsPath = path.join(clientRoot, '.eslintrc-auto-import.json')
const autoImportGlobals = JSON.parse(fs.readFileSync(autoImportGlobalsPath, 'utf8')).globals ?? {}

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  {
    name: 'app/language-options',
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

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  ...pluginVueA11y.configs['flat/recommended'],
  {
    name: 'app/a11y-overrides',
    files: ['**/*.vue'],
    rules: {
      // Постепенное закрытие долга label/форм (много SelectBox / floating labels)
      'vuejs-accessibility/label-has-for': 'warn',
      'vuejs-accessibility/form-control-has-label': 'warn',
      'vuejs-accessibility/mouse-events-have-key-events': 'warn',
      'vuejs-accessibility/click-events-have-key-events': 'warn',
      'vuejs-accessibility/interactive-supports-focus': 'warn',
      'vuejs-accessibility/no-static-element-interactions': 'warn',
      // Жёсткие правила — ошибки
      'vuejs-accessibility/alt-text': 'error',
      'vuejs-accessibility/anchor-has-content': 'error',
      'vuejs-accessibility/heading-has-content': 'error',
      'vuejs-accessibility/no-redundant-roles': 'error',
    },
  },
  {
    name: 'app/vue-name-overrides',
    files: ['**/*.vue'],
    rules: {
      // Однословные имена страниц/корневых view в ядре допустимы
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    name: 'app/js-overrides',
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  skipFormatting,
]
