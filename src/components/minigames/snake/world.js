export const SNAKE_COLS = 16
export const SNAKE_ROWS = 14
const START_LEN = 3
const BASE_PACE = 0.17
const MIN_PACE = 0.07
const OVER_DELAY = 0.55

function cellKey(col, row) {
  return `${col}:${row}`
}

function occupied(body) {
  const keys = new Set()
  for (const part of body) {
    keys.add(cellKey(part.c, part.r))
  }
  return keys
}

function placeFood(state) {
  const taken = occupied(state.body)
  const free = []
  for (let row = 0; row < SNAKE_ROWS; row += 1) {
    for (let col = 0; col < SNAKE_COLS; col += 1) {
      if (!taken.has(cellKey(col, row))) {
        free.push({ c: col, r: row })
      }
    }
  }
  if (!free.length) {
    state.food = null
    return
  }
  state.food = free[Math.floor(Math.random() * free.length)]
}

function startBody() {
  const row = Math.floor(SNAKE_ROWS / 2)
  const head = Math.floor(SNAKE_COLS / 2)
  const body = []
  for (let i = 0; i < START_LEN; i += 1) {
    body.push({ c: head - i, r: row })
  }
  return body
}

export function createSnakeWorld() {
  return resetSnakeWorld()
}

export function resetSnakeWorld(state) {
  const next = state || {}
  const body = startBody()
  next.body = body
  next.prevBody = body.map((part) => ({ ...part }))
  next.dir = { dc: 1, dr: 0 }
  next.pending = null
  next.score = 0
  next.best = state?.best ?? 0
  next.alive = true
  next.started = false
  next.stepAcc = 0
  next.progress = 1
  next.overReady = false
  next.deadAge = 0
  next.won = false
  next.food = null
  placeFood(next)
  return next
}

export function enqueueSnakeDir(state, dc, dr) {
  if (!state.alive) {
    return
  }
  const current = state.pending || state.dir
  if (state.body.length > 1 && current.dc === -dc && current.dr === -dr) {
    return
  }
  const first = !state.started
  state.pending = { dc, dr }
  state.started = true
  if (first) {
    state.stepAcc = paceOf(state)
  }
}

function paceOf(state) {
  return Math.max(MIN_PACE, BASE_PACE - state.score * 0.004)
}

function killSnake(state) {
  state.alive = false
  state.won = false
  state.progress = 1
  state.deadAge = 0
  state.overReady = false
}

function applyStep(state) {
  if (state.pending) {
    state.dir = state.pending
    state.pending = null
  }
  const head = state.body[0]
  const next = { c: head.c + state.dir.dc, r: head.r + state.dir.dr }
  if (next.c < 0 || next.c >= SNAKE_COLS || next.r < 0 || next.r >= SNAKE_ROWS) {
    killSnake(state)
    return
  }
  const grow = Boolean(state.food && next.c === state.food.c && next.r === state.food.r)
  const blocking = grow ? state.body : state.body.slice(0, -1)
  if (blocking.some((part) => part.c === next.c && part.r === next.r)) {
    killSnake(state)
    return
  }
  state.prevBody = state.body.map((part) => ({ ...part }))
  state.body = [next, ...state.body]
  if (grow) {
    state.score += 1
    state.best = Math.max(state.best, state.score)
    placeFood(state)
    if (!state.food) {
      state.alive = false
      state.won = true
      state.overReady = false
      state.deadAge = 0
    }
  } else {
    state.body.pop()
  }
}

export function stepSnakeWorld(state, dt, { reduced = false, animate = true } = {}) {
  if (!state.alive) {
    state.deadAge += dt
    if (!state.overReady && state.deadAge >= (reduced ? 0.15 : OVER_DELAY)) {
      state.overReady = true
    }
    return
  }
  if (!state.started) {
    state.progress = 1
    return
  }
  const pace = reduced ? MIN_PACE : paceOf(state)
  state.stepAcc += dt
  state.progress = animate && !reduced ? Math.min(1, state.stepAcc / pace) : 1
  if (state.stepAcc < pace) {
    return
  }
  state.stepAcc -= pace
  if (state.stepAcc > pace) {
    state.stepAcc = 0
  }
  applyStep(state)
  state.progress = animate && !reduced && state.alive ? 0 : 1
}

export function visualSnake(state) {
  const curr = state.body
  const prev = state.prevBody
  const t = state.progress
  if (!prev || t >= 1) {
    return curr.map((part) => ({ c: part.c, r: part.r }))
  }
  const parts = []
  for (let i = 0; i < curr.length; i += 1) {
    const to = curr[i]
    const from = prev[i] || prev[prev.length - 1]
    parts.push({
      c: from.c + (to.c - from.c) * t,
      r: from.r + (to.r - from.r) * t,
    })
  }
  return parts
}
