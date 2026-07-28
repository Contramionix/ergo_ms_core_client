import { reactive } from 'vue'

/**
 * Глобальное состояние экрана «доступ запрещён».
 * Не вызываем tGlobal на top-level: routers.js импортируется sync из main.js
 * до ensureBootLocales(), иначе missing-key в пустом messages.
 * Строки задаёт routers/страницы при active=true; AccessDenied падает на i18n через ??.
 */
export const accessDeniedState = reactive({
  active: false,
  title: null,
  message: null,
})
