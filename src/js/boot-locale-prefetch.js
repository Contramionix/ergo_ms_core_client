/**
 * Прогрев каталога i18n до очереди модулей main.js (критично на Vite dev + Slow 3G).
 * Без тяжёлых зависимостей — только glob локалей.
 */
const localeLoaders = import.meta.glob('../i18n/locales/*/index.js')

function resolveLocale() {
  try {
    const raw = localStorage.getItem('language') || 'ru'
    const base = String(raw).trim().toLowerCase().split(/[-_]/)[0]
    if (base === 'en' || base === 'fr' || base === 'ru') {
      return base
    }
  } catch {
    /* ignore */
  }
  return 'ru'
}

function prefetchLocale(locale) {
  const key = `../i18n/locales/${locale}/index.js`
  const loader = localeLoaders[key]
  if (loader) {
    void loader().catch(() => {})
  }
}

const active = resolveLocale()
prefetchLocale(active)
if (active !== 'ru') {
  prefetchLocale('ru')
}
