import { reactive } from 'vue'

export const accessDeniedState = reactive({
  active: false,
  title: 'Доступ ограничен',
  message: 'У вас нет прав для просмотра этой страницы.',
})

