import { PULSE_COLS, pulseDisplay } from './world.js'
import { PULSE, VISIBLE_ROWS } from './theme.js'

function layout(width, height) {
  const cell = Math.min(width / PULSE_COLS, height / VISIBLE_ROWS)
  const gridW = cell * PULSE_COLS
  const gridH = cell * VISIBLE_ROWS
  return {
    cell,
    gridW,
    gridH,
    originX: (width - gridW) / 2,
    originY: (height - gridH) / 2,
  }
}

function cellRect(col, row, camera, box) {
  return {
    x: box.originX + col * box.cell,
    y: box.originY + (VISIBLE_ROWS - 1 - (row - camera)) * box.cell,
    s: box.cell,
  }
}

function particleColor(tone) {
  if (tone === 'shatter' || tone === 'land') {
    return PULSE.player
  }
  return PULSE.muted
}

function drawStrip(ctx, strip, camera, box) {
  const { y, s } = cellRect(0, strip.row, camera, box)
  if (y + s < box.originY - s || y > box.originY + box.gridH + s) {
    return
  }
  const top = Math.round(y) + 0.5
  const bottom = Math.round(y + s) + 0.5
  const fast = strip.type !== 'pad' && strip.speed > 1.1
  ctx.fillStyle = strip.type === 'pad' ? PULSE.pad : fast ? PULSE.voidFast : PULSE.void
  ctx.fillRect(box.originX, y, box.gridW, s + 0.5)

  ctx.lineWidth = 1
  if (strip.type === 'pad') {
    ctx.strokeStyle = PULSE.grid
    ctx.beginPath()
    ctx.moveTo(box.originX, top)
    ctx.lineTo(box.originX + box.gridW, top)
    ctx.moveTo(box.originX, bottom)
    ctx.lineTo(box.originX + box.gridW, bottom)
    for (let col = 0; col <= PULSE_COLS; col += 1) {
      const x = Math.round(box.originX + col * box.cell) + 0.5
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + s)
    }
    ctx.stroke()
    return
  }

  ctx.strokeStyle = PULSE.stripe
  ctx.beginPath()
  ctx.moveTo(box.originX, top)
  ctx.lineTo(box.originX + box.gridW, top)
  ctx.moveTo(box.originX, bottom)
  ctx.lineTo(box.originX + box.gridW, bottom)
  ctx.stroke()
  ctx.strokeStyle = PULSE.grid
  ctx.beginPath()
  for (let col = 1; col < PULSE_COLS; col += 1) {
    const x = Math.round(box.originX + col * box.cell) + 0.5
    ctx.moveTo(x, y + 3)
    ctx.lineTo(x, y + s - 3)
  }
  ctx.stroke()
}

function drawVehicle(ctx, strip, item, camera, box) {
  const { x, y, s } = cellRect(item.x, strip.row, camera, box)
  const w = Math.max(4, item.w * s - 2)
  const h = s - 4
  const left = x + 1
  const top = y + 2
  ctx.fillStyle = PULSE.platform
  ctx.fillRect(left, top, w, h)
  ctx.strokeStyle = PULSE.platformEdge
  ctx.lineWidth = 1
  ctx.strokeRect(left + 0.5, top + 0.5, w - 1, h - 1)

  const dir = Math.sign(strip.signedSpeed || strip.dir || 1)
  const fast = strip.speed > 1.1
  const count = fast ? 4 : 3
  const span = fast ? 4 : 7
  ctx.strokeStyle = PULSE.muted
  ctx.beginPath()
  for (let i = 1; i <= count; i += 1) {
    const cx = left + (w * i) / (count + 1)
    const cy = top + h / 2
    ctx.moveTo(cx - dir * span * 0.45, cy - 3)
    ctx.lineTo(cx + dir * span * 0.45, cy)
    ctx.lineTo(cx - dir * span * 0.45, cy + 3)
  }
  ctx.stroke()
}

function drawCellHints(ctx, state, camera, box, reduced) {
  if (!state.alive) {
    return
  }
  const view = pulseDisplay(state)
  const here = cellRect(Math.round(view.col), Math.round(view.row), camera, box)
  ctx.fillStyle = PULSE.here
  ctx.fillRect(here.x, here.y, here.s, here.s)
  if (state.player.hopping || reduced) {
    return
  }
  const next = cellRect(Math.round(view.col), Math.round(view.row) + 1, camera, box)
  ctx.fillStyle = PULSE.next
  ctx.fillRect(next.x, next.y, next.s, next.s)
}

function drawTrails(ctx, state, camera, box, reduced) {
  if (reduced || !state.trails) {
    return
  }
  for (const trail of state.trails) {
    const a = 1 - trail.age / trail.life
    const { x, y, s } = cellRect(trail.col, trail.row, camera, box)
    ctx.fillStyle = PULSE.player
    ctx.globalAlpha = a * 0.28
    const pad = s * 0.28
    ctx.fillRect(x + pad, y + pad, s - pad * 2, s - pad * 2)
  }
  ctx.globalAlpha = 1
}

function drawLandFlash(ctx, state, camera, box, reduced) {
  if (reduced || !state.landFlash) {
    return
  }
  const view = pulseDisplay(state)
  const { x, y, s } = cellRect(view.col, view.row, camera, box)
  ctx.fillStyle = PULSE.player
  ctx.globalAlpha = Math.min(1, state.landFlash / 0.12) * 0.35
  ctx.fillRect(x + 2, y + 2, s - 4, s - 4)
  ctx.globalAlpha = 1
}

function drawPlayer(ctx, state, camera, box, reduced) {
  if (!state.alive) {
    return
  }
  const view = pulseDisplay(state)
  const { x, y, s } = cellRect(view.col, view.row, camera, box)
  const inset = s * 0.18
  const loft = reduced ? 0 : view.loft * s * 0.12
  const squash = reduced ? 1 : view.squash
  const w = (s - inset * 2) * (2 - squash)
  const h = (s - inset * 2) * squash
  const px = x + (s - w) / 2
  const py = y + (s - h) / 2 - loft
  ctx.fillStyle = PULSE.player
  ctx.fillRect(px, py, w, h)
  ctx.strokeStyle = PULSE.platformEdge
  ctx.lineWidth = 1
  ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1)
}

function drawHunter(ctx, state, camera, box) {
  if (!state.alive || state.status !== 'warn') {
    return
  }
  const view = pulseDisplay(state)
  const { x, y, s } = cellRect(view.col, view.row, camera, box)
  ctx.fillStyle = state.death === 'scan' ? PULSE.danger : PULSE.scanFill
  ctx.fillRect(x + 3, y + 3, s - 6, s - 6)
}

function drawHazard(ctx, state, camera, box) {
  if (typeof state.hazard !== 'number') {
    return
  }
  const front = cellRect(0, state.hazard, camera, box)
  const bottom = box.originY + box.gridH
  const top = front.y + front.s
  if (top > bottom + box.cell) {
    return
  }
  const hot = Boolean(state.waveTelegraph)
  ctx.fillStyle = hot ? PULSE.waveHot : PULSE.wave
  ctx.fillRect(box.originX, top, box.gridW, Math.max(0, bottom - top))
  ctx.fillStyle = PULSE.danger
  ctx.fillRect(box.originX, top, box.gridW, 3)
}

function drawParticles(ctx, state, camera, box) {
  for (const spark of state.particles) {
    const { x, y, s } = cellRect(spark.col, spark.row, camera, box)
    const a = Math.max(0, 1 - spark.age / spark.life)
    const size = Math.max(3, s * (spark.size || 0.12))
    ctx.save()
    ctx.translate(x + s / 2, y + s / 2)
    ctx.rotate(spark.angle || 0)
    ctx.globalAlpha = a
    ctx.fillStyle = particleColor(spark.tone)
    ctx.fillRect(-size / 2, -size / 2, size, size)
    ctx.strokeStyle = PULSE.platformEdge
    ctx.lineWidth = 1
    ctx.strokeRect(-size / 2 + 0.5, -size / 2 + 0.5, size - 1, size - 1)
    ctx.restore()
  }
}

export function drawPulseWorld(ctx, state, width, height, { reduced = false } = {}) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = PULSE.bg
  ctx.fillRect(0, 0, width, height)

  const box = layout(width, height)
  ctx.save()
  if (!reduced && state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3)
  }

  ctx.beginPath()
  ctx.rect(box.originX, box.originY, box.gridW, box.gridH)
  ctx.clip()

  const ordered = [...state.strips].sort((a, b) => a.row - b.row)
  for (const strip of ordered) {
    drawStrip(ctx, strip, state.camera, box)
  }
  drawCellHints(ctx, state, state.camera, box, reduced)
  for (const strip of ordered) {
    for (const item of strip.vehicles) {
      drawVehicle(ctx, strip, item, state.camera, box)
    }
  }
  drawHazard(ctx, state, state.camera, box)
  drawTrails(ctx, state, state.camera, box, reduced)
  drawLandFlash(ctx, state, state.camera, box, reduced)
  drawParticles(ctx, state, state.camera, box)
  drawHunter(ctx, state, state.camera, box)
  drawPlayer(ctx, state, state.camera, box, reduced)
  ctx.strokeStyle = PULSE.stripe
  ctx.lineWidth = 2
  ctx.strokeRect(box.originX + 1, box.originY + 1, box.gridW - 2, box.gridH - 2)
  ctx.restore()
}
