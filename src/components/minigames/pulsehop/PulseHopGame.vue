<script setup>
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getReducedMotionActive } from '@/composables/useUiModes.js'
import { drawPulseWorld } from './draw.js'
import { attachPulseInput } from './input.js'
import { createGameLoop } from './loop.js'
import { PULSE } from './theme.js'
import {
  createPulseWorld,
  enqueuePulseHop,
  resetPulseWorld,
  stepPulseWorld,
} from './world.js'

const { t } = useAppI18n()

const canvasRef = ref(null)
const hostRef = ref(null)
const stageRef = ref(null)
const hidden = ref(false)
const BEST_KEY = 'ergo-pulsehop-best'

function readSessionBest() {
  try {
    const raw = sessionStorage.getItem(BEST_KEY)
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) && value >= 0 ? value : 0
  } catch {
    return 0
  }
}

function writeSessionBest(value) {
  try {
    sessionStorage.setItem(BEST_KEY, String(value))
  } catch {
    // вкладка в приватном режиме может запретить запись
  }
}

const score = ref(0)
const best = ref(0)
const alive = ref(true)
const status = ref('run')
const waveTelegraph = ref(false)
const overReady = ref(false)

const world = createPulseWorld()
world.best = Math.max(world.best, readSessionBest())

let loop = null
let detachInput = null
let resizeObserver = null

const reduced = () => getReducedMotionActive()

function syncHud() {
  score.value = world.score
  if (world.best > best.value) {
    writeSessionBest(world.best)
  }
  best.value = world.best
  alive.value = world.alive
  status.value = world.status
  waveTelegraph.value = Boolean(world.waveTelegraph)
  overReady.value = Boolean(world.overReady)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const stage = stageRef.value
  if (!canvas || !stage) {
    return
  }
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(280, stage.clientWidth)
  const height = Math.max(320, stage.clientHeight)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
}

function paint() {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const ratio = canvas.width / Math.max(1, canvas.clientWidth)
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  drawPulseWorld(ctx, world, canvas.clientWidth, canvas.clientHeight, { reduced: reduced() })
}

function hop(dc, dr) {
  enqueuePulseHop(world, dc, dr)
  syncHud()
}

function restart(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  resetPulseWorld(world)
  syncHud()
  paint()
}

function onVisibility() {
  hidden.value = document.visibilityState === 'hidden'
}

const statusText = computed(() => {
  if (status.value === 'hit') {
    return t('minigames.pulsehop.hit')
  }
  if (status.value === 'fall') {
    return t('minigames.pulsehop.fall')
  }
  if (status.value === 'behind') {
    return t('minigames.pulsehop.behind')
  }
  if (status.value === 'scan') {
    return t('minigames.pulsehop.scan')
  }
  if (status.value === 'warn') {
    return t('minigames.pulsehop.warn')
  }
  if (waveTelegraph.value) {
    return t('minigames.pulsehop.wave')
  }
  return t('minigames.pulsehop.run')
})

function bindInput() {
  if (detachInput || !canvasRef.value) {
    return
  }
  detachInput = attachPulseInput(canvasRef.value, hop)
}

function unbindInput() {
  detachInput?.()
  detachInput = null
}

function startLoop() {
  if (loop?.running) {
    return
  }
  loop = createGameLoop({
    update: (dt) => {
      stepPulseWorld(world, dt, { reduced: reduced() })
      syncHud()
    },
    draw: paint,
    isPaused: () => hidden.value,
  })
  loop.start()
}

function stopLoop() {
  loop?.stop()
  loop = null
}

onMounted(() => {
  syncHud()
  resizeCanvas()
  paint()
  bindInput()
  hostRef.value?.focus()
  resizeObserver = new ResizeObserver(() => {
    resizeCanvas()
    paint()
  })
  if (stageRef.value) {
    resizeObserver.observe(stageRef.value)
  }
  document.addEventListener('visibilitychange', onVisibility)
  startLoop()
})

onActivated(() => {
  hidden.value = false
  bindInput()
  hostRef.value?.focus()
  startLoop()
})

onDeactivated(() => {
  hidden.value = true
  unbindInput()
  stopLoop()
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  resizeObserver?.disconnect()
  unbindInput()
  stopLoop()
})
</script>

<template>
  <div
    ref="hostRef"
    class="pulse"
    tabindex="0"
    :style="{
      '--pulse-bg': PULSE.bg,
      '--pulse-text': PULSE.text,
      '--pulse-muted': PULSE.muted,
      '--pulse-pad': PULSE.pad,
      '--pulse-grid': PULSE.grid,
      '--pulse-overlay': PULSE.overlay,
    }"
    :aria-label="t('minigames.pulsehop.board')"
  >
    <div ref="stageRef" class="pulse__stage">
      <canvas ref="canvasRef" class="pulse__canvas" />
      <div class="pulse__hud">
        <p class="pulse__score">{{ t('minigames.pulsehop.score', { n: score }) }}</p>
        <p class="pulse__best">{{ t('minigames.pulsehop.best', { n: best }) }}</p>
      </div>
      <p class="pulse__status" aria-live="polite">{{ statusText }}</p>
      <Transition name="pulse-over">
        <div v-if="overReady" class="pulse__over">
          <p class="pulse__over-text">{{ statusText }}</p>
          <button
            type="button"
            class="pulse__again"
            @pointerdown.stop.prevent="restart"
            @click.stop.prevent="restart"
          >
            {{ t('minigames.again') }}
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pulse {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1 1 auto;
  outline: none;
  color: var(--pulse-text);
  touch-action: manipulation;
}

.pulse__stage {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--pulse-bg);
}

.pulse__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.pulse__hud {
  position: absolute;
  inset: 0.75rem auto auto 0.75rem;
  z-index: 1;
  display: flex;
  justify-content: flex-start;
  gap: 1.25rem;
  max-width: calc(100% - 3.5rem);
  font-size: 0.875rem;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.pulse__score,
.pulse__best,
.pulse__over-text,
.pulse__status {
  margin: 0;
}

.pulse__score {
  color: var(--pulse-text);
}

.pulse__best {
  color: var(--pulse-muted);
}

.pulse__over {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--pulse-overlay);
}

.pulse-over-enter-active {
  transition: opacity 0.85s ease;
}

.pulse-over-leave-active {
  transition: opacity 0.2s ease;
}

.pulse-over-enter-from,
.pulse-over-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .pulse-over-enter-active,
  .pulse-over-leave-active {
    transition-duration: 0.2s;
  }
}

.pulse__over-text {
  max-width: 18rem;
  font-size: 1rem;
  line-height: 1.5;
  text-align: center;
  color: var(--pulse-text);
}

.pulse__status {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  left: 0.75rem;
  z-index: 1;
  min-height: 0;
  max-width: none;
  font-size: 0.875rem;
  line-height: 1.5;
  text-align: center;
  color: var(--pulse-text);
  pointer-events: none;
}

.pulse__again {
  min-width: 4.5rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.25;
  color: var(--pulse-text);
  background: var(--pulse-pad);
  border: 1px solid var(--pulse-grid);
  border-radius: 0;
  cursor: pointer;

  &:hover {
    background: var(--pulse-grid);
  }

  &:active {
    opacity: 0.72;
  }

  &:focus-visible {
    outline: 2px solid var(--pulse-text);
    outline-offset: 2px;
  }
}
</style>
