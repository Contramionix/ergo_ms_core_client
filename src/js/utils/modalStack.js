/** Базовый z-index совпадает с Bootstrap modal (1055). */
export const MODAL_BASE_Z_INDEX = 1055

/** Шаг между уровнями вложенных модалок. */
export const MODAL_Z_INDEX_STEP = 10

/** @type {{ id: string, zIndex: number }[]} */
const stack = []

let scrollLockCount = 0

/**
 * Регистрирует модалку в стеке и возвращает её z-index.
 * @param {string} id
 * @param {number|null|undefined} explicitZIndex — ручной z-index (обратная совместимость)
 * @returns {number}
 */
export function pushModal(id, explicitZIndex = null) {
  const existing = stack.find((entry) => entry.id === id)
  if (existing) {
    return existing.zIndex
  }

  const zIndex = explicitZIndex != null
    ? Number(explicitZIndex)
    : (stack.length === 0 ? MODAL_BASE_Z_INDEX - MODAL_Z_INDEX_STEP : stack[stack.length - 1].zIndex)
      + MODAL_Z_INDEX_STEP

  stack.push({ id, zIndex })
  return zIndex
}

/**
 * Снимает модалку со стека.
 * @param {string} id
 */
export function popModal(id) {
  const index = stack.findIndex((entry) => entry.id === id)
  if (index !== -1) {
    stack.splice(index, 1)
  }
}

/** @returns {number} */
export function getTopZIndex() {
  if (stack.length === 0) {
    return MODAL_BASE_Z_INDEX
  }
  return stack[stack.length - 1].zIndex
}

/** @returns {number} */
export function getNextZIndex() {
  return getTopZIndex() + MODAL_Z_INDEX_STEP
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isTopModal(id) {
  return stack.length > 0 && stack[stack.length - 1].id === id
}

export function acquireScrollLock() {
  scrollLockCount += 1
  document.body.style.overflow = 'hidden'
}

export function releaseScrollLock() {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = ''
  }
}
