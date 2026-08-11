import { hideBootstrapMask } from '@/js/bootstrapMask.js'
import { tGlobal } from '@/i18n/index.js'
import '@/scss/_boot-failure-page.scss'

const FALLBACK = {
  badge: 'Ошибка запуска',
  title: 'Не удалось загрузить приложение',
  failed: 'Обновите страницу или проверьте, что API запущен.',
  hint: 'Если ошибка повторяется, убедитесь, что сервер API доступен, и попробуйте снова.',
  reload: 'Обновить',
  failedLog: 'Не удалось запустить клиент:',
}

/** Упрощённый wordmark (как ErgomsLogo), без зависимости от Vue/Lucide. */
const WORDMARK_SVG = `
<svg class="boot-failure-page__logo" viewBox="0 0 432 131" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <path d="M6.72 102V32.88H51.36V43.728H18.288V60.768H45.6V71.616H18.288V91.152H51.36V102H6.72ZM62.8763 102V32.88H91.4363C92.1083 32.88 92.9723 32.912 94.0283 32.976C95.0843 33.008 96.0603 33.104 96.9563 33.264C100.956 33.872 104.252 35.2 106.844 37.248C109.468 39.296 111.404 41.888 112.652 45.024C113.932 48.128 114.572 51.584 114.572 55.392C114.572 61.024 113.148 65.872 110.3 69.936C107.452 73.968 103.084 76.464 97.1963 77.424L92.2523 77.856H74.4443V102H62.8763ZM102.572 102L88.9403 73.872L100.7 71.28L115.676 102H102.572ZM74.4443 67.056H90.9563C91.5963 67.056 92.3163 67.024 93.1163 66.96C93.9163 66.896 94.6523 66.768 95.3243 66.576C97.2443 66.096 98.7483 65.248 99.8363 64.032C100.956 62.816 101.74 61.44 102.188 59.904C102.668 58.368 102.908 56.864 102.908 55.392C102.908 53.92 102.668 52.416 102.188 50.88C101.74 49.312 100.956 47.92 99.8363 46.704C98.7483 45.488 97.2443 44.64 95.3243 44.16C94.6523 43.968 93.9163 43.856 93.1163 43.824C92.3163 43.76 91.5963 43.728 90.9563 43.728H74.4443V67.056ZM154.763 103.44C150.283 103.44 146.075 102.656 142.139 101.088C138.235 99.488 134.795 97.152 131.819 94.08C128.875 91.008 126.571 87.248 124.907 82.8C123.243 78.32 122.411 73.2 122.411 67.44C122.411 59.888 123.819 53.44 126.635 48.096C129.451 42.72 133.307 38.608 138.203 35.76C143.099 32.88 148.619 31.44 154.763 31.44C163.275 31.44 170.011 33.424 174.971 37.392C179.963 41.328 183.339 46.864 185.099 54L173.291 55.872C171.979 51.776 169.835 48.512 166.859 46.08C163.883 43.616 160.091 42.384 155.483 42.384C150.843 42.32 146.987 43.328 143.915 45.408C140.843 47.488 138.523 50.416 136.955 54.192C135.419 57.968 134.651 62.384 134.651 67.44C134.651 72.496 135.419 76.896 136.955 80.64C138.491 84.352 140.795 87.248 143.867 89.328C146.971 91.408 150.843 92.48 155.483 92.544C158.971 92.576 162.027 91.952 164.651 90.672C167.275 89.36 169.419 87.392 171.083 84.768C172.747 82.112 173.867 78.8 174.443 74.832H162.251V65.76H186.731C186.795 66.272 186.843 67.024 186.875 68.016C186.907 69.008 186.923 69.6 186.923 69.792C186.923 76.32 185.627 82.128 183.035 87.216C180.475 92.272 176.795 96.24 171.995 99.12C167.195 102 161.451 103.44 154.763 103.44ZM292.658 102V32.88H303.074L326.978 81.84L350.882 32.88H361.298V102H350.498V57.696L329.282 102H324.674L303.506 57.696V102H292.658ZM400.367 103.44C395.311 103.44 390.751 102.56 386.687 100.8C382.655 99.04 379.327 96.528 376.703 93.264C374.111 89.968 372.463 86.064 371.759 81.552L383.759 79.728C384.783 83.824 386.879 86.992 390.047 89.232C393.247 91.472 396.927 92.592 401.087 92.592C403.551 92.592 405.871 92.208 408.047 91.44C410.223 90.672 411.983 89.552 413.327 88.08C414.703 86.608 415.391 84.8 415.391 82.656C415.391 81.696 415.231 80.816 414.911 80.016C414.591 79.184 414.111 78.448 413.471 77.808C412.863 77.168 412.063 76.592 411.071 76.08C410.111 75.536 408.991 75.072 407.711 74.688L389.855 69.408C388.319 68.96 386.655 68.368 384.863 67.632C383.103 66.864 381.423 65.824 379.823 64.512C378.255 63.168 376.959 61.472 375.935 59.424C374.943 57.344 374.447 54.784 374.447 51.744C374.447 47.296 375.567 43.568 377.807 40.56C380.079 37.52 383.119 35.248 386.927 33.744C390.767 32.24 395.023 31.504 399.695 31.536C404.431 31.568 408.655 32.384 412.367 33.984C416.079 35.552 419.183 37.84 421.679 40.848C424.175 43.856 425.935 47.488 426.959 51.744L414.527 53.904C414.015 51.472 413.023 49.408 411.551 47.712C410.111 45.984 408.335 44.672 406.223 43.776C404.143 42.88 401.919 42.4 399.551 42.336C397.247 42.304 395.103 42.656 393.119 43.392C391.167 44.096 389.583 45.12 388.367 46.464C387.183 47.808 386.591 49.376 386.591 51.168C386.591 52.864 387.103 54.256 388.127 55.344C389.151 56.4 390.415 57.248 391.919 57.888C393.455 58.496 395.007 59.008 396.575 59.424L408.959 62.88C410.655 63.328 412.559 63.936 414.671 64.704C416.783 65.472 418.815 66.544 420.767 67.92C422.719 69.296 424.319 71.104 425.567 73.344C426.847 75.584 427.487 78.432 427.487 81.888C427.487 85.472 426.735 88.624 425.231 91.344C423.759 94.032 421.759 96.272 419.231 98.064C416.703 99.856 413.807 101.2 410.543 102.096C407.311 102.992 403.919 103.44 400.367 103.44Z" fill="currentColor"/>
  <g class="ergoms-logo__cog">
    <path d="M240 98C248.487 98 256.626 94.6286 262.627 88.6274C268.629 82.6263 272 74.4869 272 66C272 57.5131 268.629 49.3737 262.627 43.3726C256.626 37.3714 248.487 34 240 34C231.513 34 223.374 37.3714 217.373 43.3726C211.371 49.3737 208 57.5131 208 66C208 74.4869 211.371 82.6263 217.373 88.6274C223.374 94.6286 231.513 98 240 98Z"/>
    <path d="M240 74C242.122 74 244.157 73.1571 245.657 71.6569C247.157 70.1566 248 68.1217 248 66C248 63.8783 247.157 61.8434 245.657 60.3431C244.157 58.8429 242.122 58 240 58C237.878 58 235.843 58.8429 234.343 60.3431C232.843 61.8434 232 63.8783 232 66C232 68.1217 232.843 70.1566 234.343 71.6569C235.843 73.1571 237.878 74 240 74Z"/>
    <path d="M240 26V34"/><path d="M240 106V98"/><path d="M260 100.64L256 93.72"/><path d="M236 59.08L220 31.36"/>
    <path d="M274.64 86L267.72 82"/><path d="M205.36 46L212.28 50"/><path d="M248 66H280"/><path d="M200 66H208"/>
    <path d="M274.64 46L267.72 50"/><path d="M205.36 86L212.28 82"/><path d="M260 31.36L256 38.28"/><path d="M236 72.92L220 100.64"/>
  </g>
</svg>
`.trim()

function resolveBootString(key, fallback) {
  try {
    const value = tGlobal(key)
    if (typeof value === 'string' && value && value !== key) {
      return value
    }
  } catch {
    /* i18n может быть ещё не готов */
  }
  return fallback
}

const STALE_FALLBACK = {
  badge: 'Устаревшая версия',
  title: 'Страница устарела после обновления',
  failed: 'Загружена старая версия интерфейса. Обновите страницу, чтобы подтянуть новый клиент.',
  hint: 'Если сообщение повторяется, закройте лишние вкладки приложения и откройте сайт заново.',
  failedLog: 'Устаревший клиент после деплоя:',
}

function getBootFailureCopy(variant = 'boot') {
  if (variant === 'stale') {
    return {
      badge: resolveBootString('errors.stale.badge', STALE_FALLBACK.badge),
      title: resolveBootString('errors.stale.title', STALE_FALLBACK.title),
      failed: resolveBootString('errors.stale.failed', STALE_FALLBACK.failed),
      hint: resolveBootString('errors.stale.hint', STALE_FALLBACK.hint),
      reload: resolveBootString('common.refresh', FALLBACK.reload),
      failedLog: resolveBootString('errors.stale.failedLog', STALE_FALLBACK.failedLog),
    }
  }
  return {
    badge: resolveBootString('errors.boot.badge', FALLBACK.badge),
    title: resolveBootString('errors.boot.title', FALLBACK.title),
    failed: resolveBootString('errors.boot.failed', FALLBACK.failed),
    hint: resolveBootString('errors.boot.hint', FALLBACK.hint),
    reload: resolveBootString('common.refresh', FALLBACK.reload),
    failedLog: resolveBootString('errors.boot.failedLog', FALLBACK.failedLog),
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  if (className) {
    node.className = className
  }
  if (text != null) {
    node.textContent = text
  }
  return node
}

function buildBootFailurePage(copy) {
  const page = el('main', 'boot-failure-page')
  page.id = 'main-content'
  page.tabIndex = -1
  page.setAttribute('role', 'alert')
  page.setAttribute('aria-live', 'assertive')

  const backdrop = el('div', 'boot-failure-page__backdrop')
  backdrop.setAttribute('aria-hidden', 'true')
  for (const n of [1, 2, 3]) {
    backdrop.appendChild(el('span', `boot-failure-page__orb boot-failure-page__orb--${n}`))
  }

  const card = el('section', 'boot-failure-page__card')

  const wordmark = el('div', 'boot-failure-page__wordmark')
  wordmark.innerHTML = WORDMARK_SVG
  card.appendChild(wordmark)

  card.appendChild(el('p', 'boot-failure-page__badge', copy.badge))
  card.appendChild(el('h1', 'boot-failure-page__title', copy.title))
  card.appendChild(el('p', 'boot-failure-page__text', copy.failed))

  const actions = el('div', 'boot-failure-page__actions')
  const reloadBtn = el('button', 'boot-failure-page__reload', copy.reload)
  reloadBtn.type = 'button'
  reloadBtn.setAttribute('data-boot-reload', '')
  reloadBtn.addEventListener('click', () => {
    window.location.reload()
  })
  actions.appendChild(reloadBtn)
  card.appendChild(actions)

  card.appendChild(el('p', 'boot-failure-page__hint', copy.hint))

  page.appendChild(backdrop)
  page.appendChild(card)
  return page
}

/**
 * Отдельный чанк: не должен попадать в sync/preload граф main на Slow 3G.
 * @param {unknown} error
 * @param {{ variant?: 'boot'|'stale' }} [options]
 */
export async function showBootFailure(error, options = {}) {
  hideBootstrapMask()
  const variant = options.variant === 'stale' ? 'stale' : 'boot'
  const copy = getBootFailureCopy(variant)
  try {
    const { logError } = await import('@/js/utils/logError.js')
    logError(copy.failedLog, error)
  } catch {
    /* ignore */
  }
  if (typeof document === 'undefined') {
    return
  }
  const root = document.getElementById('app')
  if (!root) {
    return
  }
  root.replaceChildren(buildBootFailurePage(copy))
  root.querySelector('#main-content')?.focus?.({ preventScroll: true })
}
