<script setup>
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getReducedMotionActive } from '@/composables/useUiModes.js'
import { drawBounceWorld } from './draw.js'
import { attachBounceInput } from './input.js'
import { createGameLoop } from './loop.js'
import {
  BOUNCE_ASPECT,
  createBounceWorld,
  launchBounceBall,
  resetBounceWorld,
  setBounceSteer,
  setBounceTarget,
  stepBounceWorld,
} from './world.js'

const { t } = useAppI18n()

const BEST_KEY = 'ergo-bounce-best'

const hostRef = ref(null)
const stageRef = ref(null)
const canvasRef = ref(null)
const hidden = ref(false)
const score = ref(0)
const best = ref(0)
const lives = ref(3)
const wave = ref(1)
const status = ref('ready')
const overReady = ref(false)
const bonus = ref('')

const world = createBounceWorld()
let loop = null
let detachInput = null
let resizeObserver = null

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

function activeBonus() {
  if (world.wide > 0) {
    return 'wide'
  }
  if (world.slow > 0) {
    return 'slow'
  }
  return ''
}

function syncHud() {
  score.value = world.score
  if (world.best > best.value) {
    writeSessionBest(world.best)
  }
  best.value = world.best
  lives.value = world.lives
  wave.value = world.wave
  status.value = world.status
  overReady.value = Boolean(world.overReady)
  bonus.value = activeBonus()
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const stage = stageRef.value
  if (!canvas || !stage) {
    return
  }
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(240, stage.clientWidth)
  const height = Math.max(220, stage.clientHeight)
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
  const scale = canvas.width / Math.max(1, canvas.clientWidth)
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  drawBounceWorld(ctx, world, canvas.clientWidth, canvas.clientHeight, {
    reduced: getReducedMotionActive(),
  })
}

function restart(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  resetBounceWorld(world)
  syncHud()
  paint()
}

function onVisibility() {
  hidden.value = document.visibilityState === 'hidden'
}

const statusText = computed(() => {
  if (status.value === 'lose') {
    return t('minigames.bounce.lose')
  }
  if (status.value === 'wave') {
    return t('minigames.bounce.wave', { n: wave.value })
  }
  if (status.value === 'ready') {
    return t('minigames.bounce.ready')
  }
  if (bonus.value === 'wide') {
    return t('minigames.bounce.bonusWide')
  }
  if (bonus.value === 'slow') {
    return t('minigames.bounce.bonusSlow')
  }
  return t('minigames.bounce.play')
})

function bindInput() {
  if (detachInput || !canvasRef.value) {
    return
  }
  detachInput = attachBounceInput(canvasRef.value, {
    onTarget: (x) => setBounceTarget(world, x),
    onSteer: (dir) => setBounceSteer(world, dir),
    onLaunch: () => launchBounceBall(world),
  })
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
      stepBounceWorld(world, dt, { reduced: getReducedMotionActive() })
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
  world.best = Math.max(world.best, readSessionBest())
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
  <div ref="hostRef" class="bounce" tabindex="0">
    <div class="bounce__hud">
      <p class="bounce__score">{{ t('minigames.bounce.score', { n: score }) }}</p>
      <p class="bounce__stat">{{ t('minigames.bounce.lives', { n: lives }) }}</p>
      <p class="bounce__stat">{{ t('minigames.bounce.best', { n: best }) }}</p>
    </div>

    <div
      ref="stageRef"
      class="bounce__stage"
      :style="{ aspectRatio: String(BOUNCE_ASPECT) }"
    >
      <canvas
        ref="canvasRef"
        class="bounce__canvas"
        :aria-label="t('minigames.bounce.board')"
      />
      <Transition name="bounce-over">
        <div v-if="overReady" class="bounce__over">
          <p class="bounce__over-text">{{ t('minigames.bounce.lose') }}</p>
          <button
            type="button"
            class="ui-btn ui-btn--secondary"
            @pointerdown.stop.prevent="restart"
            @click.stop.prevent="restart"
          >
            {{ t('minigames.again') }}
          </button>
        </div>
      </Transition>
    </div>

    <p class="bounce__status" aria-live="polite">{{ statusText }}</p>

    <button
      type="button"
      class="ui-btn ui-btn--secondary bounce__again"
      @click="restart"
    >
      {{ t('minigames.again') }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.bounce {
  width: min(100%, 24rem);
  margin: 0 auto;
  text-align: center;
  outline: none;
}

.bounce__hud {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem 1.15rem;
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.bounce__score,
.bounce__stat,
.bounce__status,
.bounce__over-text {
  margin: 0;
}

.bounce__score {
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.bounce__stat {
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
}

.bounce__stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 16px;
}

.bounce__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.bounce__status {
  margin-top: 1rem;
  min-height: 2.6em;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.bounce__again {
  margin-top: 0.35rem;
}

.bounce__over {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  background: color-mix(in srgb, var(--ui-surface, #fff) 82%, transparent);
  border-radius: 16px;
}

.bounce__over-text {
  max-width: 16rem;
  font-size: 1rem;
  line-height: 1.5;
}

.bounce-over-enter-active {
  transition: opacity 0.65s ease;
}

.bounce-over-leave-active {
  transition: opacity 0.2s ease;
}

.bounce-over-enter-from,
.bounce-over-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .bounce-over-enter-active,
  .bounce-over-leave-active {
    transition-duration: 0.2s;
  }
}

html[data-ergo-motion='reduce'] {
  .bounce-over-enter-active,
  .bounce-over-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
