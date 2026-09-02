const HOLD = {
  ArrowLeft: -1,
  KeyA: -1,
  ArrowRight: 1,
  KeyD: 1,
}

export function attachBounceInput(canvas, { onTarget, onSteer, onLaunch }) {
  const held = new Set()

  function fieldX(event) {
    const rect = canvas.getBoundingClientRect()
    if (!rect.width) {
      return 0.5
    }
    return (event.clientX - rect.left) / rect.width
  }

  function refreshSteer() {
    let dir = 0
    for (const code of held) {
      dir += HOLD[code] || 0
    }
    onSteer(dir > 0 ? 1 : dir < 0 ? -1 : 0)
  }

  function onKeyDown(event) {
    if (event.target?.closest?.('button, input, textarea, select')) {
      return
    }
    if (event.code === 'Space') {
      event.preventDefault()
      onLaunch()
      return
    }
    if (!(event.code in HOLD)) {
      return
    }
    event.preventDefault()
    held.add(event.code)
    refreshSteer()
  }

  function onKeyUp(event) {
    if (event.code in HOLD) {
      held.delete(event.code)
      refreshSteer()
    }
  }

  function onPointerMove(event) {
    onTarget(fieldX(event))
  }

  function onPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }
    if (event.target?.closest?.('button')) {
      return
    }
    canvas.setPointerCapture?.(event.pointerId)
    onTarget(fieldX(event))
    onLaunch()
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerdown', onPointerDown)

  return function detach() {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerdown', onPointerDown)
    held.clear()
    onSteer(0)
  }
}
