const TONE = {
  bg: '#efe8da',
  field: '#f7f1e6',
  edge: 'rgba(92, 78, 58, 0.18)',
  paddle: '#1f2937',
  ball: '#111827',
  flash: 'rgba(255, 255, 255, 0.7)',
  bricks: ['#f97316', '#ef4444', '#d946ef', '#6366f1', '#06b6d4', '#22c55e'],
  drops: {
    wide: '#2563eb',
    slow: '#eab308',
    extra: '#7c3aed',
    life: '#16a34a',
  },
}

function roundRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function layout(width, height) {
  const pad = 8
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  return { pad, innerW, innerH, x: pad, y: pad }
}

function px(nx, box) {
  return box.x + nx * box.innerW
}

function py(ny, box) {
  return box.y + ny * box.innerH
}

export function drawBounceWorld(ctx, state, width, height, { reduced = false } = {}) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = TONE.bg
  ctx.fillRect(0, 0, width, height)

  const box = layout(width, height)
  ctx.fillStyle = TONE.field
  roundRect(ctx, box.x, box.y, box.innerW, box.innerH, 14)
  ctx.fill()
  ctx.strokeStyle = TONE.edge
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.innerW, box.innerH)
  ctx.clip()

  for (const brick of state.bricks) {
    if (!brick.alive && (!brick.flash || reduced)) {
      continue
    }
    const x = px(brick.x, box)
    const y = py(brick.y, box)
    const w = brick.w * box.innerW
    const h = brick.h * box.innerH
    ctx.fillStyle = TONE.bricks[brick.tone] || TONE.bricks[0]
    if (!brick.alive) {
      ctx.globalAlpha = brick.flash / 0.12
    }
    roundRect(ctx, x, y, w, h, 5)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  if (!reduced) {
    for (const flash of state.flashes) {
      const a = 1 - flash.age / flash.life
      ctx.fillStyle = TONE.flash
      ctx.globalAlpha = a * 0.7
      ctx.beginPath()
      ctx.arc(px(flash.x, box), py(flash.y, box), 10 + (1 - a) * 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  for (const drop of state.drops) {
    const x = px(drop.x, box)
    const y = py(drop.y, box)
    const r = drop.r * box.innerW
    ctx.fillStyle = TONE.drops[drop.kind] || TONE.paddle
    roundRect(ctx, x - r, y - r * 0.7, r * 2, r * 1.4, 4)
    ctx.fill()
  }

  const paddle = state.paddle
  const pw = paddle.w * box.innerW
  const ph = paddle.h * box.innerH
  ctx.fillStyle = TONE.paddle
  roundRect(ctx, px(paddle.x, box) - pw / 2, py(paddle.y, box) - ph / 2, pw, ph, 6)
  ctx.fill()

  ctx.fillStyle = TONE.ball
  for (const ball of state.balls) {
    ctx.beginPath()
    ctx.arc(px(ball.x, box), py(ball.y, box), ball.r * box.innerW, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}
