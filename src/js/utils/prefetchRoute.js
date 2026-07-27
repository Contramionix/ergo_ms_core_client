/**
 * Прогрев lazy-чанка маршрута до клика (hover / focus в меню).
 * Не меняет текущий route; ошибки загрузки игнорируются.
 */

const prefetched = new Set()

/**
 * @param {import('vue-router').Router} router
 * @param {string|null|undefined} routeName
 */
export function prefetchRouteByName(router, routeName) {
  if (!router || !routeName || typeof routeName !== 'string') {
    return
  }
  if (prefetched.has(routeName)) {
    return
  }
  prefetched.add(routeName)

  try {
    const resolved = router.resolve({ name: routeName })
    for (const record of resolved.matched) {
      const components = record.components || {}
      for (const loader of Object.values(components)) {
        if (typeof loader === 'function') {
          Promise.resolve(loader()).catch(() => {})
        }
      }
    }
  } catch {
    prefetched.delete(routeName)
  }
}
