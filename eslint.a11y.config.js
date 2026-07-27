/**
 * Только правила vuejs-accessibility (для `npm run lint:a11y`).
 * Резолв пакетов — как в eslint.config.js.
 */
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const npmRoot = path.resolve(clientRoot, '../../virtual_env/npm')
const requireFromNpm = createRequire(path.join(npmRoot, 'package.json'))

const pluginVue = requireFromNpm('eslint-plugin-vue')
const pluginVueA11y = requireFromNpm('eslint-plugin-vuejs-accessibility')

export default [
  {
    name: 'a11y/files',
    files: ['src/**/*.{vue,js}'],
  },
  {
    name: 'a11y/ignores',
    ignores: ['**/dist/**', '**/coverage/**'],
  },
  // Парсер Vue нужен для правил a11y в template
  ...pluginVue.configs['flat/essential'].map((block) => ({
    ...block,
    rules: {},
  })),
  ...pluginVueA11y.configs['flat/recommended'],
  {
    name: 'a11y/severity',
    files: ['**/*.vue'],
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
      // Отключить vue essential в этом прогоне
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'off',
    },
  },
]
