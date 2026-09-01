const STEP = 1 / 60
const MAX_FRAME = 0.05

export function createGameLoop({ update, draw, isPaused }) {
  let raf = 0
  let last = 0
  let acc = 0
  let running = false

  function frame(now) {
    if (!running) {
      return
    }
    raf = window.requestAnimationFrame(frame)
    if (isPaused?.()) {
      last = now
      acc = 0
      return
    }
    const seconds = last ? Math.min((now - last) / 1000, MAX_FRAME) : 0
    last = now
    acc += seconds
    let steps = 0
    while (acc >= STEP && steps < 5) {
      update(STEP)
      acc -= STEP
      steps += 1
    }
    if (acc >= STEP) {
      acc = 0
    }
    draw()
  }

  return {
    start() {
      if (running) {
        return
      }
      running = true
      last = 0
      acc = 0
      raf = window.requestAnimationFrame(frame)
    },
    stop() {
      running = false
      window.cancelAnimationFrame(raf)
      raf = 0
      last = 0
      acc = 0
    },
    get running() {
      return running
    },
  }
}
