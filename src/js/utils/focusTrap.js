/**
 * Простая ловушка фокуса для модалок и drawer.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isVisible(el) {
  if (!(el instanceof HTMLElement)) return false
  if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none') return false
  return el.getClientRects().length > 0
}

export function getFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible)
}

/**
 * @param {HTMLElement} container
 * @param {{ initialFocus?: HTMLElement | null, restoreFocus?: boolean }} [options]
 * @returns {() => void} deactivate
 */
export function activateFocusTrap(container, options = {}) {
  if (!container || typeof document === 'undefined') {
    return () => {}
  }

  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null
  const restoreFocus = options.restoreFocus !== false

  const focusInitial = () => {
    const preferred = options.initialFocus
    if (preferred && container.contains(preferred) && isVisible(preferred)) {
      preferred.focus()
      return
    }
    const items = getFocusableElements(container)
    if (items.length) {
      items[0].focus()
      return
    }
    if (!container.hasAttribute('tabindex')) {
      container.setAttribute('tabindex', '-1')
    }
    container.focus()
  }

  const onKeydown = (event) => {
    if (event.key !== 'Tab') return
    const items = getFocusableElements(container)
    if (!items.length) {
      event.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement

    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
        event.preventDefault()
        last.focus()
      }
      return
    }
    if (active === last || !container.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  // После отрисовки модалки
  requestAnimationFrame(() => {
    requestAnimationFrame(focusInitial)
  })

  document.addEventListener('keydown', onKeydown)

  return () => {
    document.removeEventListener('keydown', onKeydown)
    if (restoreFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
      try {
        previouslyFocused.focus()
      } catch {
        /* element may be gone */
      }
    }
  }
}
