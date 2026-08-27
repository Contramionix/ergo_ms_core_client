/**
 * Старые модули ещё импортируют vue-toastification.
 * Оболочка показывает уведомления через vue-sonner (`toast.js`).
 */
export { useToast } from './toast.js'

export default {
  install() {},
}
