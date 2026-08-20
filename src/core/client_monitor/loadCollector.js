/** Один промис на сессию: collector не должен попадать в стартовый чанк. */
let collectorPromise = null

export function loadCollector() {
  if (!collectorPromise) {
    collectorPromise = import('./collector.js')
  }
  return collectorPromise
}
