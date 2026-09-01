import { VISIBLE_ROWS } from './theme.js'

export const PULSE_COLS = 9
const AHEAD = 20
const BEHIND = 8
const SAFE_START = 7
const HOP_TIME = 0.15
const IDLE_WARN = 3.1
const IDLE_KILL = 5.4
const MAX_DANGER_STREAK_BASE = 2
const PLAYER_INSET = 0.15
const CAMERA_LEAD = 3
const CAMERA_FOLLOW = 6
const HAZARD_START = -3.2
const WAVE_REST = 1.7
const WAVE_SURGE = 0.95
const WAVE_SURGE_SPEED = 2.6
const WAVE_CREEP = 0.18
const WAVE_TELEGRAPH = 0.45
const TRAIL_LIFE = 0.18
const LAND_FLASH = 0.12

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function emptyVehicles() {
  return []
}

function createPad(row) {
  return { type: 'pad', row, dir: 0, speed: 0, gap: 0, vehicles: emptyVehicles() }
}

function createLane(row, score) {
  const dir = Math.random() < 0.5 ? 1 : -1
  const speed = (1.15 + Math.min(score, 40) * 0.035 + rand(0, 0.45)) * dir
  const wide = Math.random() < 0.22 + Math.min(score, 30) * 0.008
  return {
    type: 'lane',
    row,
    dir,
    speed: Math.abs(speed),
    signedSpeed: speed,
    gap: rand(2.4, 3.8) - Math.min(score, 24) * 0.02,
    wide,
    vehicles: emptyVehicles(),
  }
}

function createBelt(row, score) {
  const dir = Math.random() < 0.5 ? 1 : -1
  const speed = (0.55 + Math.min(score, 36) * 0.02 + rand(0, 0.25)) * dir
  return {
    type: 'belt',
    row,
    dir,
    speed: Math.abs(speed),
    signedSpeed: speed,
    gap: rand(2.8, 4.2),
    wide: true,
    vehicles: emptyVehicles(),
  }
}

function seedTraffic(strip) {
  if (strip.type === 'pad') {
    return
  }
  const count = strip.type === 'belt' ? 4 : 4
  let x = rand(-2, 1.2)
  for (let i = 0; i < count; i += 1) {
    const w = strip.type === 'belt' || strip.wide ? 2 : 1
    const gap = strip.type === 'belt' ? rand(1.2, 1.8) : strip.gap * 0.55 + rand(0.2, 0.5)
    strip.vehicles.push({ x, w })
    x += w + gap
  }
}

function dangerWeight(score) {
  return Math.min(0.22 + score * 0.012, 0.72)
}

function nextStripType(state, row) {
  if (row < SAFE_START) {
    return 'pad'
  }
  const maxStreak = MAX_DANGER_STREAK_BASE + (state.score > 18 ? 1 : 0)
  if (state.dangerStreak >= maxStreak) {
    return 'pad'
  }
  if (Math.random() > dangerWeight(state.score)) {
    return 'pad'
  }
  return Math.random() < 0.38 ? 'belt' : 'lane'
}

function makeStrip(state, row) {
  const type = nextStripType(state, row)
  const strip = type === 'pad'
    ? createPad(row)
    : type === 'belt'
      ? createBelt(row, state.score)
      : createLane(row, state.score)
  if (type === 'pad') {
    state.dangerStreak = 0
  } else {
    state.dangerStreak += 1
  }
  seedTraffic(strip)
  return strip
}

function playerBox(col) {
  return { x: col + PLAYER_INSET, w: 1 - PLAYER_INSET * 2 }
}

function rideOverlap(item, col) {
  const box = playerBox(col)
  return Math.min(box.x + box.w, item.x + item.w) - Math.max(box.x, item.x)
}

function findRide(strip, col) {
  let best = null
  let bestOverlap = 0.2
  for (const item of strip.vehicles) {
    const overlap = rideOverlap(item, col)
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      best = item
    }
  }
  return best
}

function nearestRide(strip, col) {
  const center = col + 0.5
  let best = null
  let bestDist = 0.55
  for (const item of strip.vehicles) {
    const dist = center < item.x
      ? item.x - center
      : center > item.x + item.w
        ? center - (item.x + item.w)
        : 0
    if (dist <= bestDist) {
      bestDist = dist
      best = item
    }
  }
  return best
}

function attachRide(player, item) {
  const minOffset = -PLAYER_INSET
  const maxOffset = item.w - (1 - PLAYER_INSET)
  let offset = player.col - item.x
  if (maxOffset >= minOffset) {
    offset = Math.min(Math.max(offset, minOffset), maxOffset)
  }
  player.ride = item
  player.rideOffset = offset
  player.col = item.x + offset
  player.fromCol = player.col
}

function isMoving(strip) {
  return strip.type === 'lane' || strip.type === 'belt'
}

export function createPulseWorld() {
  return resetPulseWorld()
}

export function resetPulseWorld(state) {
  const next = state || {}
  next.score = 0
  next.best = state?.best ?? 0
  next.alive = true
  next.death = ''
  next.status = 'run'
  next.idle = 0
  next.shake = 0
  next.particles = []
  next.pending = null
  next.dangerStreak = 0
  next.clock = 0
  next.hazard = HAZARD_START
  next.wavePhase = 'rest'
  next.waveTimer = 0
  next.waveMark = HAZARD_START
  next.waveTelegraph = false
  next.trails = []
  next.landFlash = 0
  next.overReady = false
  next.deadAge = 0
  next.reducedMotion = false
  next.camera = 2 - CAMERA_LEAD
  next.player = {
    col: 4,
    row: 2,
    fromCol: 4,
    fromRow: 2,
    hop: 0,
    hopping: false,
    squash: 1,
    ride: null,
    rideOffset: 0,
  }
  next.strips = []
  next.nextRow = 0
  while (next.nextRow < SAFE_START + AHEAD) {
    next.strips.push(makeStrip(next, next.nextRow))
    next.nextRow += 1
  }
  return next
}

function stripAt(state, row) {
  return state.strips.find((strip) => strip.row === row) || null
}

function spawnShatter(state, col, row, reduced = false) {
  state.particles = []
  const count = reduced ? 6 : 16
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      col: col + rand(-0.18, 0.18),
      row: row + rand(-0.18, 0.18),
      vx: rand(-0.85, 0.85),
      vy: rand(-0.35, 0.9),
      gravity: reduced ? -0.5 : -1.15,
      life: reduced ? rand(0.35, 0.55) : rand(1.25, 1.9),
      age: 0,
      size: rand(0.1, 0.24),
      spin: reduced ? 0 : rand(-2.4, 2.4),
      angle: rand(0, Math.PI * 2),
      tone: 'shatter',
    })
  }
}

function kill(state, reason) {
  if (!state.alive) {
    return
  }
  state.alive = false
  state.death = reason
  state.status = reason
  state.shake = 0
  state.pending = null
  state.landFlash = 0
  state.overReady = false
  state.deadAge = 0
  spawnShatter(state, state.player.col, state.player.row, state.reducedMotion)
}

function finishHop(state) {
  const player = state.player
  player.hopping = false
  player.hop = 0
  player.squash = 0.78
  player.fromCol = player.col
  player.fromRow = player.row
  state.score = Math.max(state.score, Math.floor(player.row) - 2)
  state.best = Math.max(state.best, state.score)
  const strip = stripAt(state, Math.round(player.row))
  if (!strip) {
    kill(state, 'fall')
    return
  }
  player.ride = null
  player.rideOffset = 0
  if (strip.type === 'pad') {
    player.col = Math.round(player.col)
    player.fromCol = player.col
  }
  if (isMoving(strip)) {
    const item = findRide(strip, player.col) || nearestRide(strip, player.col)
    if (!item) {
      kill(state, 'fall')
      return
    }
    attachRide(player, item)
  }
  state.landFlash = LAND_FLASH
}

function startHop(state, dc, dr) {
  const player = state.player
  const col = (dc !== 0 ? Math.round(player.col) : player.col) + dc
  const row = player.row + dr
  if (col < 0 || col >= PULSE_COLS) {
    return false
  }
  if (row < 0) {
    return false
  }
  if (!state.trails) {
    state.trails = []
  }
  state.trails.push({
    col: player.col,
    row: player.row,
    age: 0,
    life: TRAIL_LIFE,
  })
  if (state.trails.length > 6) {
    state.trails.shift()
  }
  player.fromCol = player.col
  player.fromRow = player.row
  player.col = col
  player.row = row
  player.ride = null
  player.hopping = true
  player.hop = 0
  player.squash = 1.18
  state.idle = 0
  if (state.status === 'warn') {
    state.status = 'run'
  }
  return true
}

export function enqueuePulseHop(state, dc, dr) {
  if (!state.alive) {
    return
  }
  if (state.player.hopping) {
    state.pending = { dc, dr }
    return
  }
  startHop(state, dc, dr)
}

function wrapVehicle(item, pad) {
  const span = PULSE_COLS + pad
  if (item.x > PULSE_COLS + pad) {
    item.x -= span + item.w + 1
  } else if (item.x + item.w < -pad) {
    item.x += span + item.w + 1
  }
}

function stepTraffic(strip, dt) {
  if (strip.type === 'pad') {
    return
  }
  for (const item of strip.vehicles) {
    item.x += strip.signedSpeed * dt
    wrapVehicle(item, strip.gap + 2)
  }
}

function rideMoving(state) {
  const player = state.player
  if (player.hopping) {
    return
  }
  const strip = stripAt(state, Math.round(player.row))
  if (!strip || !isMoving(strip)) {
    player.ride = null
    return
  }
  const item = (player.ride && strip.vehicles.includes(player.ride))
    ? player.ride
    : findRide(strip, player.col)
  if (!item) {
    kill(state, 'fall')
    return
  }
  if (player.ride !== item) {
    attachRide(player, item)
  }
  player.ride = item
  player.col = item.x + player.rideOffset
  player.fromCol = player.col
  if (player.col < -0.2 || player.col > PULSE_COLS - 0.8) {
    kill(state, 'fall')
  }
}

function cullAndGrow(state) {
  const minRow = Math.floor(state.camera) - BEHIND
  state.strips = state.strips.filter((strip) => strip.row >= minRow)
  while (state.nextRow < state.camera + VISIBLE_ROWS + AHEAD) {
    state.strips.push(makeStrip(state, state.nextRow))
    state.nextRow += 1
  }
}

function stepParticles(state, dt) {
  for (const spark of state.particles) {
    spark.age += dt
    spark.vy += (spark.gravity || 0) * dt
    spark.col += spark.vx * dt
    spark.row += spark.vy * dt
    spark.angle = (spark.angle || 0) + (spark.spin || 0) * dt
  }
  state.particles = state.particles.filter((spark) => spark.age < spark.life)
  if (state.landFlash > 0) {
    state.landFlash = Math.max(0, state.landFlash - dt)
  }
  if (state.trails) {
    for (const trail of state.trails) {
      trail.age += dt
    }
    state.trails = state.trails.filter((trail) => trail.age < trail.life)
  }
}

function stepHazard(state, dt) {
  if (typeof state.hazard !== 'number') {
    state.hazard = HAZARD_START
    state.wavePhase = 'rest'
    state.waveTimer = 0
    state.waveMark = HAZARD_START
    state.waveTelegraph = false
  }
  const creep = WAVE_CREEP + Math.min(state.score, 40) * 0.004
  state.hazard += creep * dt
  state.waveTimer += dt
  if (state.wavePhase === 'rest') {
    state.waveTelegraph = state.waveTimer >= WAVE_REST - WAVE_TELEGRAPH
    if (state.waveTimer >= WAVE_REST) {
      state.wavePhase = 'surge'
      state.waveTimer = 0
      state.waveMark = state.hazard
      state.waveTelegraph = false
    }
  } else if (state.hazard - state.waveMark >= WAVE_SURGE || state.waveTimer >= 0.7) {
    state.wavePhase = 'rest'
    state.waveTimer = 0
    state.waveMark = state.hazard
    state.waveTelegraph = false
  } else {
    state.hazard += WAVE_SURGE_SPEED * dt
    state.waveTelegraph = false
  }

  const feet = state.player.hopping
    ? Math.min(state.player.row, state.player.fromRow)
    : state.player.row
  if (feet <= state.hazard) {
    kill(state, 'behind')
  }
}

export function stepPulseWorld(state, dt, { reduced = false } = {}) {
  state.reducedMotion = reduced
  state.clock += dt
  if (state.shake > 0) {
    state.shake = Math.max(0, state.shake - dt)
  }
  stepParticles(state, dt)
  if (!state.alive) {
    state.deadAge += dt
    const delay = state.reducedMotion ? 0.18 : 0.85
    if (!state.overReady && state.deadAge >= delay) {
      state.overReady = true
    }
    return
  }

  const hopTime = reduced ? 0.04 : HOP_TIME
  if (state.player.hopping) {
    state.player.hop += dt / hopTime
    state.player.squash += (1 - state.player.squash) * Math.min(1, dt * 10)
    if (state.player.hop >= 1) {
      finishHop(state)
      if (state.alive && state.pending) {
        const next = state.pending
        state.pending = null
        startHop(state, next.dc, next.dr)
      }
    }
  } else {
    state.player.squash += (1 - state.player.squash) * Math.min(1, dt * 12)
  }

  for (const strip of state.strips) {
    stepTraffic(strip, dt)
  }
  rideMoving(state)
  stepHazard(state, dt)

  const follow = state.player.row - CAMERA_LEAD
  state.camera += (follow - state.camera) * Math.min(1, dt * CAMERA_FOLLOW)

  if (state.alive && !state.player.hopping) {
    state.idle += dt
    if (state.idle >= IDLE_KILL) {
      kill(state, 'scan')
    } else if (state.idle >= IDLE_WARN) {
      state.status = 'warn'
    }
  }

  cullAndGrow(state)
}

export function pulseDisplay(state) {
  const player = state.player
  const t = Math.min(1, player.hop)
  const ease = 1 - (1 - t) ** 3
  const col = player.fromCol + (player.col - player.fromCol) * ease
  const row = player.fromRow + (player.row - player.fromRow) * ease
  const loft = player.hopping ? Math.sin(Math.PI * ease) : 0
  return { col, row, loft, squash: player.squash }
}
