const LAYOUT_PAGE_SELECTOR = '.layout-page'
const MAX_SAVED = 40

/** @type {Map<string, number>} */
const savedByPath = new Map()

function layoutPageEl() {
  if (typeof document === 'undefined') {
    return null
  }
  return document.querySelector(LAYOUT_PAGE_SELECTOR)
}

function rememberTooMany() {
  while (savedByPath.size > MAX_SAVED) {
    const oldest = savedByPath.keys().next().value
    savedByPath.delete(oldest)
  }
}

export function rememberLayoutPageScroll(path) {
  if (!path) {
    return
  }
  const el = layoutPageEl()
  savedByPath.set(path, el ? el.scrollTop : 0)
  rememberTooMany()
}

export function applyLayoutPageScroll(top) {
  const el = layoutPageEl()
  if (!el) {
    return
  }
  el.scrollTop = Math.max(0, Number(top) || 0)
}

export function restoreLayoutPageScroll(path) {
  applyLayoutPageScroll(savedByPath.get(path) ?? 0)
}
