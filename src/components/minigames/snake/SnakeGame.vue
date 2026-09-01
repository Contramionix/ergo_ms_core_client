<script setup>
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getReducedMotionActive } from '@/composables/useUiModes.js'
import { drawSnakeWorld } from './draw.js'
import { attachSnakeInput } from './input.js'
import { createGameLoop } from './loop.js'
import {
  createSnakeWorld,
  enqueueSnakeDir,
  resetSnakeWorld,
  SNAKE_COLS,
  SNAKE_ROWS,
  stepSnakeWorld,
} from './world.js'

const { t } = useAppI18n()

const BEST_KEY = 'ergo-snake-best'
const MOTION_KEY = 'ergo-snake-animate'

const hostRef = ref(null)
const stageRef = ref(null)
const canvasRef = ref(null)
const hidden = ref(false)
const score = ref(0)
const best = ref(0)
const alive = ref(true)
const won = ref(false)
const started = ref(false)
const overReady = ref(false)
const animate = ref(true)

const world = createSnakeWorld()
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

function readAnimatePref() {
  try {
    const raw = sessionStorage.getItem(MOTION_KEY)
    if (raw === '0') {
      return false
    }
    if (raw === '1') {
      return true
    }
  } catch {
    // нет доступа к sessionStorage
  }
  return !getReducedMotionActive()
}

function writeAnimatePref(value) {
  try {
    sessionStorage.setItem(MOTION_KEY, value ? '1' : '0')
  } catch {
    // вкладка в приватном режиме может запретить запись
  }
}

function syncHud() {
  score.value = world.score
  if (world.best > best.value) {
    writeSessionBest(world.best)
  }
  best.value = world.best
  alive.value = world.alive
  won.value = Boolean(world.won)
  started.value = world.started
  overReady.value = Boolean(world.overReady)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const stage = stageRef.value
  if (!canvas || !stage) {
    return
  }
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(240, stage.clientWidth)
  const height = Math.max(200, stage.clientHeight)
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
  drawSnakeWorld(ctx, world, canvas.clientWidth, canvas.clientHeight)
}

function turn(dc, dr) {
  enqueueSnakeDir(world, dc, dr)
  syncHud()
}

function restart(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  resetSnakeWorld(world)
  syncHud()
  paint()
}

function setAnimate(value) {
  animate.value = value
  writeAnimatePref(value)
}

function onVisibility() {
  hidden.value = document.visibilityState === 'hidden'
}

const statusText = computed(() => {
  if (!alive.value && won.value) {
    return t('minigames.snake.win')
  }
  if (!alive.value) {
    return t('minigames.snake.lose')
  }
  if (!started.value) {
    return t('minigames.snake.ready')
  }
  return t('minigames.snake.play')
})

function bindInput() {
  if (detachInput || !canvasRef.value) {
    return
  }
  detachInput = attachSnakeInput(canvasRef.value, turn)
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
      stepSnakeWorld(world, dt, {
        reduced: getReducedMotionActive(),
        animate: animate.value,
      })
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
  animate.value = readAnimatePref()
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
  <div ref="hostRef" class="snake" tabindex="0">
    <div class="snake__hud">
      <p class="snake__score">{{ t('minigames.snake.score', { n: score }) }}</p>
      <p class="snake__best">{{ t('minigames.snake.best', { n: best }) }}</p>
    </div>

    <div class="snake__tools">
      <ToggleSwitch
        :model-value="animate"
        :label="t('minigames.snake.animate')"
        @update:model-value="setAnimate"
      />
    </div>

    <div
      ref="stageRef"
      class="snake__stage"
      :style="{ aspectRatio: `${SNAKE_COLS} / ${SNAKE_ROWS}` }"
    >
      <canvas
        ref="canvasRef"
        class="snake__canvas"
        :aria-label="t('minigames.snake.board')"
      />
      <Transition :name="animate ? 'snake-over' : ''">
        <div v-if="overReady" class="snake__over">
          <p class="snake__over-text">{{ statusText }}</p>
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

    <p class="snake__status" aria-live="polite">{{ statusText }}</p>

    <button
      type="button"
      class="ui-btn ui-btn--secondary snake__again"
      @click="restart"
    >
      {{ t('minigames.again') }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.snake {
  width: min(100%, 26rem);
  margin: 0 auto;
  text-align: center;
  outline: none;
}

.snake__hud {
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  margin: 0 0 0.65rem;
  font-size: 0.875rem;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.snake__tools {
  display: flex;
  justify-content: center;
  margin: 0 0 0.75rem;
}

.snake__score,
.snake__best,
.snake__status,
.snake__over-text {
  margin: 0;
}

.snake__score {
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.snake__best {
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
}

.snake__stage {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 16px;
}

.snake__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.snake__status {
  margin-top: 1rem;
  min-height: 2.6em;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.snake__again {
  margin-top: 0.35rem;
}

.snake__over {
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

.snake__over-text {
  max-width: 16rem;
  font-size: 1rem;
  line-height: 1.5;
}

.snake-over-enter-active {
  transition: opacity 0.65s ease;
}

.snake-over-leave-active {
  transition: opacity 0.2s ease;
}

.snake-over-enter-from,
.snake-over-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .snake-over-enter-active,
  .snake-over-leave-active {
    transition-duration: 0.2s;
  }
}

html[data-ergo-motion='reduce'] {
  .snake-over-enter-active,
  .snake-over-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
