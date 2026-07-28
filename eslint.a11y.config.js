/**
 * Только правила vuejs-accessibility (для lint:a11y).
 * basePath = корень репозитория (как в eslint.config.js).
 */
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(clientRoot, '../..')
const npmRoot = path.resolve(projectRoot, 'virtual_env/npm')
const requireFromNpm = createRequire(path.join(npmRoot, 'package.json'))

const { defineConfig } = requireFromNpm('eslint/config')
const pluginVue = requireFromNpm('eslint-plugin-vue')
const pluginVueA11y = requireFromNpm('eslint-plugin-vuejs-accessibility')

const vueJsFiles = [
  'core/client/src/**/*.{vue,js}',
  'modules/*/client/**/*.{vue,js}',
]
const vueFiles = ['core/client/**/*.vue', 'modules/*/client/**/*.vue']

export default defineConfig({
  basePath: projectRoot,
  extends: [
    {
      name: 'a11y/ignores',
      ignores: [
        '**/dist/**',
        '**/coverage/**',
        '**/node_modules/**',
        'virtual_env/**',
      ],
    },
    ...pluginVue.configs['flat/essential'].map((block) => ({
      ...block,
      files: vueJsFiles,
      rules: {},
    })),
    ...pluginVueA11y.configs['flat/recommended'].map((block) => ({
      ...block,
      files: vueFiles,
    })),
    {
      name: 'a11y/severity',
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
        'vue/multi-word-component-names': 'off',
        'vue/no-unused-vars': 'off',
      },
    },
  ],
})
