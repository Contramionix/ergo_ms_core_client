import { reactive } from 'vue'
import { tGlobal } from '@/i18n/index.js'

export const accessDeniedState = reactive({
  active: false,
  title: tGlobal('components.accessDenied.title'),
  message: tGlobal('components.accessDenied.noPermission'),
})
