<script setup>
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import LucideIcon from '@/components/LucideIcon.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getReducedMotionActive } from '@/composables/useUiModes.js'
import {
  chordSweepCell,
  createSweepGame,
  listSweepCells,
  resetSweepGame,
  revealSweepCell,
  SWEEP_MINES,
  tickSweepClock,
  toggleSweepFlag,
} from './sweep.js'

const { t } = useAppI18n()

const BEST_KEY = 'ergo-minesweeper-best'
const HOLD_MS = 420
const OVER_DELAY = 0.4

const hostRef = ref(null)
const cells = ref([])
const remaining = ref(SWEEP_MINES)
const seconds = ref(0)
const best = ref(0)
const over = ref(false)
const won = ref(false)
const overReady = ref(false)

const game = createSweepGame()
let clock = 0
let holdTimer = 0
let hold = null
let overTimer = 0
let overRaf = 0
let visible = true

function formatClock(value) {
  const safe = Math.max(0, Math.floor(value))
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function readSessionBest() {
  try {
    const raw = sessionStorage.getItem(BEST_KEY)
    const value = Number.parseInt(raw, 10)
    return Number.isFinite(value) && value > 0 ? value : 0
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

function syncView() {
  cells.value = listSweepCells(game)
  remaining.value = SWEEP_MINES - game.flags
  seconds.value = game.seconds
  over.value = game.over
  won.value = game.won
  if (game.won && (best.value === 0 || game.seconds < best.value)) {
    best.value = game.seconds
    writeSessionBest(game.seconds)
  }
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
  if (getReducedMotionActive()) {
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

function afterAction() {
  const ended = game.over
  syncView()
  if (ended && !overReady.value) {
    startOverTimer()
  }
}

function openCell(row, col) {
  const cell = game.board[row][col]
  if (cell.open) {
    if (chordSweepCell(game, row, col)) {
      afterAction()
    }
    return
  }
  if (revealSweepCell(game, row, col)) {
    afterAction()
  }
}

function flagCell(row, col) {
  if (toggleSweepFlag(game, row, col)) {
    syncView()
  }
}

function clearHold() {
  window.clearTimeout(holdTimer)
  holdTimer = 0
  hold = null
}

function onPointerDown(cell, event) {
  if (game.over) {
    return
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }
  hold = { index: cell.index, flagged: false }
  if (event.pointerType === 'mouse') {
    return
  }
  holdTimer = window.setTimeout(() => {
    if (!hold || hold.index !== cell.index) {
      return
    }
    hold.flagged = true
    flagCell(cell.row, cell.col)
  }, HOLD_MS)
}

function onPointerUp(cell, event) {
  const current = hold
  clearHold()
  if (!current || current.index !== cell.index || current.flagged) {
    return
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }
  openCell(cell.row, cell.col)
}

function onPointerCancel() {
  clearHold()
}

function onContextMenu(cell, event) {
  event.preventDefault()
  if (game.over) {
    return
  }
  clearHold()
  flagCell(cell.row, cell.col)
}

function restart(event) {
  event?.preventDefault?.()
  event?.stopPropagation?.()
  clearHold()
  stopOverTimer()
  overReady.value = false
  resetSweepGame(game)
  syncView()
}

function cellLabel(cell) {
  const name = t('minigames.minesweeper.cell', { n: cell.index + 1 })
  if (cell.flag) {
    return `${name}, ${t('minigames.minesweeper.flagged')}`
  }
  if (!cell.open) {
    return `${name}, ${t('minigames.minesweeper.hidden')}`
  }
  if (cell.mine) {
    return `${name}, ${t('minigames.minesweeper.mine')}`
  }
  if (!cell.count) {
    return `${name}, ${t('minigames.minesweeper.empty')}`
  }
  return `${name}, ${t('minigames.minesweeper.count', { n: cell.count })}`
}

const statusText = computed(() => {
  if (over.value && won.value) {
    return t('minigames.minesweeper.win')
  }
  if (over.value) {
    return t('minigames.minesweeper.lose')
  }
  return t('minigames.minesweeper.play')
})

const timeText = computed(() => formatClock(seconds.value))
const bestText = computed(() => (best.value > 0 ? formatClock(best.value) : '—'))

function startClock() {
  if (clock) {
    return
  }
  clock = window.setInterval(() => {
    if (!visible) {
      return
    }
    tickSweepClock(game)
    seconds.value = game.seconds
  }, 1000)
}

function stopClock() {
  window.clearInterval(clock)
  clock = 0
}

onMounted(() => {
  best.value = readSessionBest()
  syncView()
  startClock()
  hostRef.value?.focus()
})

onActivated(() => {
  visible = true
  startClock()
  hostRef.value?.focus()
})

onDeactivated(() => {
  visible = false
  clearHold()
})

onUnmounted(() => {
  visible = false
  clearHold()
  stopOverTimer()
  stopClock()
})
</script>

<template>
  <div ref="hostRef" class="sweep" tabindex="0">
    <div class="sweep__hud">
      <p class="sweep__stat">{{ t('minigames.minesweeper.mines', { n: remaining }) }}</p>
      <p class="sweep__stat sweep__stat--muted">{{ t('minigames.minesweeper.time', { n: timeText }) }}</p>
      <p class="sweep__stat sweep__stat--muted">{{ t('minigames.minesweeper.best', { n: bestText }) }}</p>
    </div>

    <div
      class="sweep__board"
      role="grid"
      :aria-label="t('minigames.minesweeper.board')"
    >
      <button
        v-for="cell in cells"
        :key="cell.index"
        type="button"
        class="sweep__cell"
        :class="{
          'is-open': cell.open,
          'is-flag': cell.flag,
          'is-mine': cell.open && cell.mine,
          'is-boom': cell.boom,
          'is-wrong': cell.wrong,
          [`is-n${cell.count}`]: cell.open && !cell.mine && cell.count > 0,
        }"
        role="gridcell"
        :aria-label="cellLabel(cell)"
        :disabled="over && !cell.open && !cell.flag"
        @pointerdown="onPointerDown(cell, $event)"
        @pointerup="onPointerUp(cell, $event)"
        @pointercancel="onPointerCancel"
        @contextmenu="onContextMenu(cell, $event)"
      >
        <LucideIcon
          v-if="cell.flag && !cell.open"
          name="Flag"
          :size="15"
          icon-class="sweep__mark"
        />
        <LucideIcon
          v-else-if="cell.open && cell.mine"
          name="Bomb"
          :size="15"
          icon-class="sweep__mark"
        />
        <span v-else-if="cell.open && cell.count" class="sweep__count">{{ cell.count }}</span>
      </button>
    </div>

    <p class="sweep__status" aria-live="polite">{{ statusText }}</p>

    <button
      type="button"
      class="ui-btn ui-btn--secondary sweep__again"
      @click="restart"
    >
      {{ t('minigames.again') }}
    </button>

    <Transition name="sweep-over">
      <div v-if="overReady" class="sweep__over">
        <p class="sweep__over-text">{{ statusText }}</p>
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
.sweep {
  position: relative;
  width: min(100%, 24rem);
  margin: 0 auto;
  text-align: center;
  outline: none;
}

.sweep__hud {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.85rem 1.15rem;
  margin: 0 0 0.85rem;
  font-size: 0.875rem;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}

.sweep__stat,
.sweep__status,
.sweep__over-text {
  margin: 0;
}

.sweep__stat {
  color: var(--ui-text, var(--color-primary-text, #14151a));

  &--muted {
    color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
  }
}

.sweep__board {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 0.2rem;
  width: 100%;
  padding: 0.45rem;
  background: #d7d2c8;
  border: 1px solid color-mix(in srgb, #8a8376 50%, transparent);
  border-radius: 16px;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 42%, transparent),
    0 10px 28px color-mix(in srgb, #3f2f1d 8%, transparent);
}

.sweep__cell {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  aspect-ratio: 1;
  min-height: 2.15rem;
  padding: 0;
  color: inherit;
  background: #efe8db;
  border: 0;
  border-radius: 7px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;

  &.is-flag {
    color: #dc2626;
  }

  &:hover:not(:disabled):not(.is-open) {
    background: #f6f1e6;
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, #2563eb 55%, transparent);
    outline-offset: 1px;
    z-index: 1;
  }

  &.is-open {
    background: #f7f4ee;
    box-shadow: none;
    cursor: default;
  }

  &.is-mine {
    color: #111827;
    background: #fecaca;
  }

  &.is-boom {
    color: #fff7ed;
    background: #dc2626;
  }

  &.is-wrong {
    background: #fee2e2;
  }

  &.is-n1 { color: #2563eb; }
  &.is-n2 { color: #16a34a; }
  &.is-n3 { color: #dc2626; }
  &.is-n4 { color: #7c3aed; }
  &.is-n5 { color: #b45309; }
  &.is-n6 { color: #0f766e; }
  &.is-n7 { color: #111827; }
  &.is-n8 { color: #6b7280; }
}

.sweep__count {
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.sweep__mark {
  display: block;
  width: 15px;
  height: 15px;
}

.sweep__status {
  margin-top: 1rem;
  min-height: 2.6em;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.sweep__again {
  margin-top: 0.35rem;
}

.sweep__over {
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

.sweep__over-text {
  max-width: 16rem;
  font-size: 1rem;
  line-height: 1.5;
}

.sweep-over-enter-active {
  transition: opacity 0.65s ease;
}

.sweep-over-leave-active {
  transition: opacity 0.2s ease;
}

.sweep-over-enter-from,
.sweep-over-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sweep-over-enter-active,
  .sweep-over-leave-active {
    transition-duration: 0.2s;
  }
}

html[data-ergo-motion='reduce'] {
  .sweep-over-enter-active,
  .sweep-over-leave-active {
    transition-duration: 0.2s;
  }
}
</style>
