<script setup>
import { computed, nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getReducedMotionActive } from '@/composables/useUiModes.js'
import { attachMergeInput } from './input.js'
import {
  applyMergeMove,
  createMergeGame,
  listMergeTiles,
  MERGE_SIZE,
  resetMergeGame,
} from './merge.js'

const { t } = useAppI18n()

const BEST_KEY = 'ergo-twenty48-best'
const MOTION_KEY = 'ergo-twenty48-animate'
const MOVE_MS = 200
const OVER_DELAY = 0.45
const KNOWN_TONES = new Set([2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192])

const hostRef = ref(null)
const boardRef = ref(null)
const score = ref(0)
const best = ref(0)
const won = ref(false)
const over = ref(false)
const overReady = ref(false)
const animate = ref(true)
const actors = ref([])
const grid = ref(Array(MERGE_SIZE * MERGE_SIZE).fill(0))
const slots = Array.from({ length: MERGE_SIZE * MERGE_SIZE }, (_, index) => index)

const game = createMergeGame()
let detachInput = null
let busy = false
let moveTimer = 0
let overTimer = 0
let overRaf = 0

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

function tileTone(value) {
  return KNOWN_TONES.has(value) ? String(value) : 'max'
}

function cellLabel(index) {
  const cell = t('minigames.twenty48.cell', { n: index + 1 })
  const value = grid.value[index]
  if (!value) {
    return `${cell}, ${t('minigames.twenty48.empty')}`
  }
  return `${cell}, ${value}`
}

function syncHud() {
  const values = []
  for (let row = 0; row < MERGE_SIZE; row += 1) {
    for (let col = 0; col < MERGE_SIZE; col += 1) {
      values.push(game.board[row][col]?.value || 0)
    }
  }
  grid.value = values
  score.value = game.score
  if (game.score > best.value) {
    best.value = game.score
    writeSessionBest(game.score)
  }
  won.value = game.won
  over.value = game.over
}

function showSettled() {
  actors.value = listMergeTiles(game.board).map((tile) => ({
    ...tile,
    spawn: game.spawn?.id === tile.id,
    merge: false,
  }))
}

function stopOverTimer() {
  if (overRaf) {
    window.cancelAnimationFrame(overRaf)
    overRaf = 0
  }
  overTimer = 0
}

function startOverTimer() {
  stopOverTimer()
  if (!animate.value) {
    overReady.value = true
    return
  }
  let last = 0
  function tick(now) {
    if (!last) {
      last = now
    }
    overTimer += (now - last) / 1000
    last = now
    if (overTimer >= OVER_DELAY) {
      overReady.value = true
      overRaf = 0
      return
    }
    overRaf = window.requestAnimationFrame(tick)
  }
  overRaf = window.requestAnimationFrame(tick)
}

function afterMoveSettled() {
  busy = false
  if (game.over && !overReady.value) {
    startOverTimer()
  }
}

function playAnimated(traces) {
  const merges = traces.filter((trace) => trace.kind === 'merge')
  const dying = new Set(merges.flatMap((trace) => trace.parents || []))
  const slides = traces.filter((trace) => trace.kind === 'slide')
  actors.value = slides.map((trace) => ({
    id: trace.id,
    value: trace.value,
    row: trace.fromRow,
    col: trace.fromCol,
    spawn: false,
    merge: false,
  }))
  nextTick(() => {
    window.requestAnimationFrame(() => {
      actors.value = slides.map((trace) => ({
        id: trace.id,
        value: trace.value,
        row: trace.row,
        col: trace.col,
        spawn: false,
        merge: false,
      }))
      window.clearTimeout(moveTimer)
      moveTimer = window.setTimeout(() => {
        const kept = slides
          .filter((trace) => !dying.has(trace.id))
          .map((trace) => ({
            id: trace.id,
            value: trace.value,
            row: trace.row,
            col: trace.col,
            spawn: false,
            merge: false,
          }))
        const born = merges.map((trace) => ({
          id: trace.id,
          value: trace.value,
          row: trace.row,
          col: trace.col,
          spawn: false,
          merge: true,
        }))
        if (game.spawn) {
          born.push({
            id: game.spawn.id,
            value: game.spawn.value,
            row: game.spawn.row,
            col: game.spawn.col,
            spawn: true,
            merge: false,
          })
        }
        actors.value = [...kept, ...born]
        afterMoveSettled()
      }, MOVE_MS)
    })
  })
}

function playMove(dir) {
  if (busy) {
    return
  }
  if (!applyMergeMove(game, dir)) {
    return
  }
  syncHud()
  if (!animate.value) {
    showSettled()
    afterMoveSettled()
    return
  }
  busy = true
  playAnimated(game.traces)
}

function restart(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  window.clearTimeout(moveTimer)
  stopOverTimer()
  busy = false
  overReady.value = false
  resetMergeGame(game)
  syncHud()
  showSettled()
}

function setAnimate(value) {
  animate.value = value
  writeAnimatePref(value)
}

const statusText = computed(() => {
  if (over.value) {
    return t('minigames.twenty48.lose')
  }
  if (won.value) {
    return t('minigames.twenty48.win')
  }
  return t('minigames.twenty48.play')
})

function bindInput() {
  if (detachInput || !boardRef.value) {
    return
  }
  detachInput = attachMergeInput(boardRef.value, playMove)
}

function unbindInput() {
  detachInput?.()
  detachInput = null
}

onMounted(() => {
  animate.value = readAnimatePref()
  best.value = readSessionBest()
  syncHud()
  showSettled()
  bindInput()
  hostRef.value?.focus()
})

onActivated(() => {
  bindInput()
  hostRef.value?.focus()
})

onDeactivated(() => {
  unbindInput()
})

onUnmounted(() => {
  window.clearTimeout(moveTimer)
  stopOverTimer()
  unbindInput()
})
</script>

<template>
  <div
    ref="hostRef"
    class="merge"
    :class="{ 'is-still': !animate }"
    tabindex="0"
  >
    <div class="merge__hud">
      <p class="merge__score">{{ t('minigames.twenty48.score', { n: score }) }}</p>
      <p class="merge__best">{{ t('minigames.twenty48.best', { n: best }) }}</p>
    </div>

    <div class="merge__tools">
      <ToggleSwitch
        :model-value="animate"
        :label="t('minigames.twenty48.animate')"
        @update:model-value="setAnimate"
      />
    </div>

    <div
      ref="boardRef"
      class="merge__board"
      role="grid"
      :aria-label="t('minigames.twenty48.board')"
    >
      <div
        v-for="index in slots"
        :key="index"
        class="merge__cell"
        role="gridcell"
        :aria-label="cellLabel(index)"
      />
      <div class="merge__layer" aria-hidden="true">
        <span
          v-for="tile in actors"
          :key="tile.id"
          class="merge__tile"
          :class="[
            `merge__tile--${tileTone(tile.value)}`,
            {
              'is-spawn': animate && tile.spawn,
              'is-merge': animate && tile.merge,
            },
          ]"
          :style="{ '--c': tile.col, '--r': tile.row }"
        >
          {{ tile.value }}
        </span>
      </div>
    </div>

    <p class="merge__status" aria-live="polite">{{ statusText }}</p>

    <button
      type="button"
      class="ui-btn ui-btn--secondary merge__again"
      @click="restart"
    >
      {{ t('minigames.again') }}
    </button>

    <Transition :name="animate ? 'merge-over' : ''">
      <div v-if="overReady" class="merge__over">
        <p class="merge__over-text">{{ t('minigames.twenty48.lose') }}</p>
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
</template>

<style scoped lang="scss">
.merge {
  --merge-pad: 0.55rem;
  --merge-gap: 0.45rem;
  position: relative;
  width: min(100%, 22rem);
  margin: 0 auto;
  text-align: center;
  outline: none;
}

.merge__hud {
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  margin: 0 0 0.65rem;
  font-size: 0.875rem;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.merge__tools {
  display: flex;
  justify-content: center;
  margin: 0 0 0.85rem;
}

.merge__score,
.merge__best,
.merge__status,
.merge__over-text {
  margin: 0;
}

.merge__score {
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.merge__best {
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
}

.merge__board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--merge-gap);
  width: 100%;
  aspect-ratio: 1;
  padding: var(--merge-pad);
  background: #cdc1b4;
  border: 1px solid color-mix(in srgb, #8f7a66 55%, transparent);
  border-radius: 18px;
  touch-action: none;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 42%, transparent),
    0 10px 28px color-mix(in srgb, #3f2f1d 10%, transparent);
}

.merge__cell {
  min-width: 0;
  min-height: 0;
  aspect-ratio: 1;
  background: #eee4da;
  border-radius: 10px;
}

.merge__layer {
  position: absolute;
  inset: var(--merge-pad);
  pointer-events: none;
}

.merge__tile {
  --merge-span: calc((100% - 3 * var(--merge-gap)) / 4);
  position: absolute;
  left: calc(var(--c) * (var(--merge-span) + var(--merge-gap)));
  top: calc(var(--r) * (var(--merge-span) + var(--merge-gap)));
  width: var(--merge-span);
  height: var(--merge-span);
  display: grid;
  place-items: center;
  font-size: clamp(0.95rem, 4.8vw, 1.45rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  border-radius: 10px;
  user-select: none;
  transition:
    left 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    top 0.2s cubic-bezier(0.22, 1, 0.36, 1);

  &--2 { color: #3f2f0b; background: #fde68a; }
  &--4 { color: #3b1f0a; background: #fdba74; }
  &--8 { color: #fff7ed; background: #f97316; }
  &--16 { color: #fff1f2; background: #f43f5e; }
  &--32 { color: #fdf4ff; background: #d946ef; }
  &--64 { color: #f5f3ff; background: #7c3aed; }
  &--128 { color: #eff6ff; background: #2563eb; }
  &--256 { color: #083344; background: #22d3ee; }
  &--512 { color: #052e16; background: #22c55e; }
  &--1024 { color: #1a2e05; background: #84cc16; font-size: clamp(0.8rem, 3.8vw, 1.2rem); }
  &--2048 {
    color: #3d2e0a;
    background: linear-gradient(165deg, #f8e38a 0%, #e4b429 48%, #c99712 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
    font-size: clamp(0.8rem, 3.8vw, 1.2rem);
  }
  &--4096 { color: #fff7ed; background: #b45309; font-size: clamp(0.75rem, 3.4vw, 1.1rem); }
  &--8192 { color: #f8fafc; background: #0f172a; font-size: clamp(0.75rem, 3.4vw, 1.1rem); }
  &--max { color: #fbbf24; background: #111827; font-size: clamp(0.7rem, 3.1vw, 1rem); }

  &.is-spawn {
    animation: merge-spawn 0.22s ease both;
  }

  &.is-merge {
    animation: merge-pop 0.26s ease both;
  }
}

.merge.is-still .merge__tile {
  transition: none;
}

.merge__status {
  margin-top: 1rem;
  min-height: 2.6em;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.merge__again {
  margin-top: 0.35rem;
}

.merge__over {
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
  border-radius: 18px;
}

.merge__over-text {
  max-width: 16rem;
  font-size: 1rem;
  line-height: 1.5;
}

.merge-over-enter-active {
  transition: opacity 0.7s ease;
}

.merge-over-leave-active {
  transition: opacity 0.2s ease;
}

.merge-over-enter-from,
.merge-over-leave-to {
  opacity: 0;
}

@keyframes merge-spawn {
  from {
    transform: scale(0.55);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes merge-pop {
  0% { transform: scale(1); }
  45% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
</style>
