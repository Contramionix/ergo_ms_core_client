const KEY_MAP = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
}

export function attachMergeInput(swipeTarget, enqueue) {
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
    enqueue(dir)
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
      enqueue(dx > 0 ? 'right' : 'left')
      return
    }
    enqueue(dy < 0 ? 'up' : 'down')
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
