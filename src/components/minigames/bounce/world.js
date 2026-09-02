export const BOUNCE_ASPECT = 4 / 5
const BRICK_COLS = 8
const PADDLE_Y = 0.915
const PADDLE_H = 0.028
const PADDLE_W = 0.2
const PADDLE_WIDE = 0.3
const PADDLE_SPEED = 1.15
const BALL_R = 0.016
const BASE_SPEED = 0.52
const DROP_CHANCE = 0.24
const DROP_R = 0.016
const DROP_VY = 0.28
const WIDE_TIME = 8
const SLOW_TIME = 6
const OVER_DELAY = 0.55
const DROP_KINDS = ['wide', 'slow', 'extra', 'life']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function ballSpeed(wave, slow) {
  const speed = BASE_SPEED + Math.min(wave, 8) * 0.045
  return slow > 0 ? speed * 0.68 : speed
}

function brickGrid(wave) {
  const rows = Math.min(4 + Math.floor((wave - 1) / 2), 7)
  const top = 0.1
  const gapX = 0.012
  const gapY = 0.012
  const height = 0.038
  const width = (0.92 - gapX * (BRICK_COLS - 1)) / BRICK_COLS
  const left = (1 - (width * BRICK_COLS + gapX * (BRICK_COLS - 1))) / 2
  const bricks = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < BRICK_COLS; col += 1) {
      bricks.push({
        x: left + col * (width + gapX),
        y: top + row * (height + gapY),
        w: width,
        h: height,
        tone: (row + wave) % 6,
        alive: true,
        flash: 0,
      })
    }
  }
  return bricks
}

function makeBall(x, y, vx, vy) {
  return { x, y, vx, vy, r: BALL_R, stuck: false }
}

function serveBall(state) {
  const speed = ballSpeed(state.wave, state.slow)
  const angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25)
  return makeBall(
    state.paddle.x,
    state.paddle.y - state.paddle.h / 2 - BALL_R - 0.002,
    Math.cos(angle) * speed,
    Math.sin(angle) * speed,
  )
}

function parkBall(state) {
  return {
    x: state.paddle.x,
    y: state.paddle.y - state.paddle.h / 2 - BALL_R - 0.002,
    vx: 0,
    vy: 0,
    r: BALL_R,
    stuck: true,
  }
}

function resetPaddle(state) {
  state.paddle = {
    x: 0.5,
    y: PADDLE_Y,
    w: PADDLE_W,
    h: PADDLE_H,
    target: 0.5,
  }
  state.wide = 0
  state.slow = 0
}

function startWave(state, wave) {
  state.wave = wave
  state.bricks = brickGrid(wave)
  state.drops = []
  state.balls = [parkBall(state)]
  state.launched = false
  state.status = wave > 1 ? 'wave' : 'ready'
}

export function createBounceWorld() {
  return resetBounceWorld()
}

export function resetBounceWorld(state) {
  const next = state || {}
  next.score = 0
  next.best = state?.best ?? 0
  next.lives = 3
  next.alive = true
  next.overReady = false
  next.deadAge = 0
  next.steer = 0
  next.flashes = []
  resetPaddle(next)
  startWave(next, 1)
  return next
}

export function setBounceTarget(state, x) {
  if (!state.alive) {
    return
  }
  state.paddle.target = clamp(x, 0.04, 0.96)
}

export function setBounceSteer(state, dir) {
  state.steer = dir
}

export function launchBounceBall(state) {
  if (!state.alive || state.launched) {
    return
  }
  state.balls = [serveBall(state)]
  state.launched = true
  state.status = 'play'
}

function hitBrick(ball, brick) {
  const closestX = clamp(ball.x, brick.x, brick.x + brick.w)
  const closestY = clamp(ball.y, brick.y, brick.y + brick.h)
  const dx = ball.x - closestX
  const dy = ball.y - closestY
  return dx * dx + dy * dy <= ball.r * ball.r
}

function bounceFromBrick(ball, brick) {
  const prevX = ball.x - ball.vx * (1 / 60)
  const fromLeft = prevX + ball.r <= brick.x
  const fromRight = prevX - ball.r >= brick.x + brick.w
  if (fromLeft || fromRight) {
    ball.vx *= -1
    ball.x = fromLeft ? brick.x - ball.r - 0.001 : brick.x + brick.w + ball.r + 0.001
    return
  }
  ball.vy *= -1
  if (ball.y < brick.y + brick.h / 2) {
    ball.y = brick.y - ball.r - 0.001
  } else {
    ball.y = brick.y + brick.h + ball.r + 0.001
  }
}

function spawnDrop(state, brick) {
  if (Math.random() > DROP_CHANCE) {
    return
  }
  state.drops.push({
    x: brick.x + brick.w / 2,
    y: brick.y + brick.h / 2,
    kind: DROP_KINDS[Math.floor(Math.random() * DROP_KINDS.length)],
    r: DROP_R,
  })
}

function collectDrop(state, drop) {
  if (drop.kind === 'wide') {
    state.wide = WIDE_TIME
    state.paddle.w = PADDLE_WIDE
  } else if (drop.kind === 'slow') {
    state.slow = SLOW_TIME
    const speed = ballSpeed(state.wave, state.slow)
    for (const ball of state.balls) {
      if (ball.stuck) {
        continue
      }
      const len = Math.hypot(ball.vx, ball.vy) || 1
      ball.vx = (ball.vx / len) * speed
      ball.vy = (ball.vy / len) * speed
    }
  } else if (drop.kind === 'extra') {
    const source = state.balls[0]
    if (source && !source.stuck) {
      state.balls.push(makeBall(source.x, source.y, -source.vx, source.vy))
    } else {
      state.balls.push(serveBall(state))
      state.launched = true
      state.status = 'play'
    }
  } else if (drop.kind === 'life') {
    state.lives += 1
  }
}

function breakBrick(state, brick, reduced) {
  brick.alive = false
  state.score += 10 + state.wave * 2
  state.best = Math.max(state.best, state.score)
  spawnDrop(state, brick)
  if (!reduced) {
    brick.flash = 0.12
    state.flashes.push({
      x: brick.x + brick.w / 2,
      y: brick.y + brick.h / 2,
      age: 0,
      life: 0.16,
    })
  }
}

function bouncePaddle(ball, paddle) {
  const half = paddle.w / 2
  const offset = clamp((ball.x - paddle.x) / half, -1, 1)
  const speed = Math.hypot(ball.vx, ball.vy) || BASE_SPEED
  const angle = -Math.PI / 2 + offset * 1.05
  ball.vx = Math.cos(angle) * speed
  ball.vy = Math.sin(angle) * speed
  if (ball.vy > -0.12) {
    ball.vy = -0.18
  }
  ball.y = paddle.y - paddle.h / 2 - ball.r - 0.001
}

function stepBall(state, ball, dt, reduced) {
  if (ball.stuck) {
    ball.x = state.paddle.x
    ball.y = state.paddle.y - state.paddle.h / 2 - ball.r - 0.002
    return true
  }
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt
  if (ball.x < ball.r) {
    ball.x = ball.r
    ball.vx = Math.abs(ball.vx)
  } else if (ball.x > 1 - ball.r) {
    ball.x = 1 - ball.r
    ball.vx = -Math.abs(ball.vx)
  }
  if (ball.y < ball.r) {
    ball.y = ball.r
    ball.vy = Math.abs(ball.vy)
  }
  if (ball.y > 1 + ball.r) {
    return false
  }

  const paddle = state.paddle
  const half = paddle.w / 2
  const overlapping =
    ball.vy > 0
    && ball.x >= paddle.x - half - ball.r
    && ball.x <= paddle.x + half + ball.r
    && ball.y + ball.r >= paddle.y - paddle.h / 2
    && ball.y - ball.r <= paddle.y + paddle.h / 2
  if (overlapping) {
    bouncePaddle(ball, paddle)
  }

  for (const brick of state.bricks) {
    if (!brick.alive) {
      continue
    }
    if (hitBrick(ball, brick)) {
      bounceFromBrick(ball, brick)
      breakBrick(state, brick, reduced)
      break
    }
  }
  return true
}

function loseLife(state) {
  state.lives -= 1
  state.drops = []
  if (state.lives <= 0) {
    state.alive = false
    state.status = 'lose'
    state.deadAge = 0
    state.overReady = false
    return
  }
  state.balls = [parkBall(state)]
  state.launched = false
  state.status = 'ready'
}

export function stepBounceWorld(state, dt, { reduced = false } = {}) {
  if (!state.alive) {
    state.deadAge += dt
    if (!state.overReady && state.deadAge >= (reduced ? 0.15 : OVER_DELAY)) {
      state.overReady = true
    }
    return
  }

  if (state.wide > 0) {
    state.wide = Math.max(0, state.wide - dt)
    if (state.wide === 0) {
      state.paddle.w = PADDLE_W
    }
  }
  if (state.slow > 0) {
    state.slow = Math.max(0, state.slow - dt)
  }

  const paddle = state.paddle
  if (state.steer !== 0) {
    paddle.target = clamp(paddle.target + state.steer * PADDLE_SPEED * dt, 0.04, 0.96)
  }
  paddle.x += (paddle.target - paddle.x) * Math.min(1, dt * 18)
  paddle.x = clamp(paddle.x, paddle.w / 2 + 0.02, 1 - paddle.w / 2 - 0.02)

  const kept = []
  for (const ball of state.balls) {
    if (stepBall(state, ball, dt, reduced)) {
      kept.push(ball)
    }
  }
  state.balls = kept
  if (!state.balls.length) {
    loseLife(state)
  }

  const falling = []
  for (const drop of state.drops) {
    drop.y += DROP_VY * dt
    const half = state.paddle.w / 2
    const caught =
      drop.y + drop.r >= state.paddle.y - state.paddle.h / 2
      && drop.y - drop.r <= state.paddle.y + state.paddle.h / 2
      && drop.x >= state.paddle.x - half - drop.r
      && drop.x <= state.paddle.x + half + drop.r
    if (caught) {
      collectDrop(state, drop)
      continue
    }
    if (drop.y < 1.06) {
      falling.push(drop)
    }
  }
  state.drops = falling

  for (const brick of state.bricks) {
    if (brick.flash > 0) {
      brick.flash = Math.max(0, brick.flash - dt)
    }
  }
  for (const flash of state.flashes) {
    flash.age += dt
  }
  state.flashes = state.flashes.filter((flash) => flash.age < flash.life)

  if (state.alive && state.bricks.every((brick) => !brick.alive)) {
    startWave(state, state.wave + 1)
  }
}
