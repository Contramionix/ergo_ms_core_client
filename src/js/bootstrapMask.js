/**
 * МАСКА ЗАГРУЗКИ ПРИЛОЖЕНИЯ
 *
 * Класс `app-bootstrapping` на <html> скрывает #app (см. критический инлайн-CSS
 * в index.html и bootstrap-early.js) и отключает переходы. Используется, чтобы не показывать
 * незавершённое состояние интерфейса:
 *  - при первичной загрузке/перезагрузке (класс ставится в bootstrap-early.js до бандла,
 *    снимается в App.vue после готовности роутера и отрисовки layout);
 *  - при выходе из аккаунта перед сбросом состояния и переходом на страницу входа.
 */

const BOOTSTRAP_CLASS = 'app-bootstrapping'

export function showBootstrapMask() {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.add(BOOTSTRAP_CLASS)
  }
}

export function hideBootstrapMask() {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove(BOOTSTRAP_CLASS)
  }
}
