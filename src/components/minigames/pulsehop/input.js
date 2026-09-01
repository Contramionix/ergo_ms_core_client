const KEY_MAP = {
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  KeyW: [0, 1],
  KeyS: [0, -1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
}

export function attachPulseInput(swipeTarget, enqueue) {
  const held = new Set()
  let swipe = null

  function onKeyDown(event) {
    if (event.target?.closest?.('button, input, textarea, select')) {
      return
    }
    const dir = KEY_MAP[event.code]
    if (!dir) {
      return
    }
    event.preventDefault()
    if (held.has(event.code)) {
      return
    }
    held.add(event.code)
    enqueue(dir[0], dir[1])
  }

  function onKeyUp(event) {
    held.delete(event.code)
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }
    if (event.target?.closest?.('button')) {
      return
    }
    swipe = { x: event.clientX, y: event.clientY, id: event.pointerId }
    swipeTarget.setPointerCapture?.(event.pointerId)
  }

  function onPointerUp(event) {
    if (!swipe || swipe.id !== event.pointerId) {
      return
    }
    const dx = event.clientX - swipe.x
    const dy = event.clientY - swipe.y
    swipe = null
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    if (absX < 18 && absY < 18) {
      return
    }
    if (absX > absY) {
      enqueue(dx > 0 ? 1 : -1, 0)
      return
    }
    enqueue(0, dy < 0 ? 1 : -1)
  }

  function onPointerCancel() {
    swipe = null
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  swipeTarget.addEventListener('pointerdown', onPointerDown)
  swipeTarget.addEventListener('pointerup', onPointerUp)
  swipeTarget.addEventListener('pointercancel', onPointerCancel)

  return function detach() {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    swipeTarget.removeEventListener('pointerdown', onPointerDown)
    swipeTarget.removeEventListener('pointerup', onPointerUp)
    swipeTarget.removeEventListener('pointercancel', onPointerCancel)
    held.clear()
  }
}
