/**
 * Ранняя маска загрузки — выполняется до основного бандла (см. index.html, bootstrapMask.js).
 */
document.documentElement.classList.add('app-bootstrapping')

const loader = document.getElementById('ergo-boot-loader')
if (loader) {
  loader.hidden = false
  loader.setAttribute('aria-busy', 'true')
}
