<script setup>
import { computed, ref } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { getReducedMotionActive } from '@/composables/useUiModes.js'

const { t } = useAppI18n()

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const LINE_GEOMETRY = {
  '0,1,2': { x1: '8%', y1: '16.67%', x2: '92%', y2: '16.67%' },
  '3,4,5': { x1: '8%', y1: '50%', x2: '92%', y2: '50%' },
  '6,7,8': { x1: '8%', y1: '83.33%', x2: '92%', y2: '83.33%' },
  '0,3,6': { x1: '16.67%', y1: '8%', x2: '16.67%', y2: '92%' },
  '1,4,7': { x1: '50%', y1: '8%', x2: '50%', y2: '92%' },
  '2,5,8': { x1: '83.33%', y1: '8%', x2: '83.33%', y2: '92%' },
  '0,4,8': { x1: '14%', y1: '14%', x2: '86%', y2: '86%' },
  '2,4,6': { x1: '86%', y1: '14%', x2: '14%', y2: '86%' },
}

const SLIP_CHANCE = 0.25

const board = ref(Array(9).fill(''))
const busy = ref(false)
const lastMove = ref(-1)
const scoreYou = ref(0)
const scoreOpp = ref(0)

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, getReducedMotionActive() ? 0 : ms)
  })
}

function readOutcome(cells) {
  for (const line of LINES) {
    const [a, b, c] = line
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line }
    }
  }
  if (cells.every(Boolean)) {
    return { winner: 'draw', line: null }
  }
  return { winner: '', line: null }
}

function scoreBoard(cells, maximizing) {
  const { winner } = readOutcome(cells)
  if (winner === 'O') {
    return 10
  }
  if (winner === 'X') {
    return -10
  }
  if (winner === 'draw') {
    return 0
  }
  let best = maximizing ? -Infinity : Infinity
  for (let i = 0; i < 9; i += 1) {
    if (cells[i]) {
      continue
    }
    cells[i] = maximizing ? 'O' : 'X'
    const score = scoreBoard(cells, !maximizing)
    cells[i] = ''
    best = maximizing ? Math.max(best, score) : Math.min(best, score)
  }
  return best
}

function emptyCells(cells) {
  const list = []
  for (let i = 0; i < 9; i += 1) {
    if (!cells[i]) {
      list.push(i)
    }
  }
  return list
}

function moveThatWins(cells, mark) {
  for (const index of emptyCells(cells)) {
    cells[index] = mark
    const wins = readOutcome(cells).winner === mark
    cells[index] = ''
    if (wins) {
      return index
    }
  }
  return undefined
}

function bestOpponentMove(cells) {
  let bestScore = -Infinity
  const choices = []
  for (const index of emptyCells(cells)) {
    cells[index] = 'O'
    const score = scoreBoard(cells, false)
    cells[index] = ''
    if (score > bestScore) {
      bestScore = score
      choices.length = 0
      choices.push(index)
    } else if (score === bestScore) {
      choices.push(index)
    }
  }
  return choices[Math.floor(Math.random() * choices.length)]
}

function opponentMove(cells) {
  const winNow = moveThatWins(cells, 'O')
  if (winNow !== undefined) {
    return winNow
  }
  const blockNow = moveThatWins(cells, 'X')
  if (blockNow !== undefined) {
    return blockNow
  }
  const open = emptyCells(cells)
  if (open.length && Math.random() < SLIP_CHANCE) {
    return open[Math.floor(Math.random() * open.length)]
  }
  return bestOpponentMove(cells)
}

function recordWinner(winner) {
  if (winner === 'X') {
    scoreYou.value += 1
  }
  if (winner === 'O') {
    scoreOpp.value += 1
  }
}

function resetBoard() {
  busy.value = false
  lastMove.value = -1
  board.value = Array(9).fill('')
}

const outcome = computed(() => readOutcome(board.value))
const winningLine = computed(() => outcome.value.line)
const winGeometry = computed(() => {
  if (!winningLine.value) {
    return null
  }
  return LINE_GEOMETRY[winningLine.value.join(',')] || null
})

const yourTurn = computed(() => !busy.value && !outcome.value.winner)

const statusText = computed(() => {
  if (outcome.value.winner === 'X') {
    return t('minigames.tictactoe.win')
  }
  if (outcome.value.winner === 'O') {
    return t('minigames.tictactoe.lose')
  }
  if (outcome.value.winner === 'draw') {
    return t('minigames.tictactoe.draw')
  }
  if (busy.value) {
    return t('minigames.tictactoe.wait')
  }
  return t('minigames.tictactoe.turn')
})

async function playCell(index) {
  if (busy.value || outcome.value.winner || board.value[index]) {
    return
  }
  const next = board.value.slice()
  next[index] = 'X'
  lastMove.value = index
  board.value = next
  const afterYou = readOutcome(next)
  if (afterYou.winner) {
    recordWinner(afterYou.winner)
    return
  }
  busy.value = true
  await delay(320)
  const move = opponentMove(next)
  if (move !== undefined) {
    next[move] = 'O'
    lastMove.value = move
    board.value = next.slice()
  }
  busy.value = false
  recordWinner(readOutcome(next).winner)
}

function cellLabel(mark, index) {
  const cell = t('minigames.tictactoe.cell', { n: index + 1 })
  if (mark === 'X') {
    return `${cell}, ${t('minigames.tictactoe.markX')}`
  }
  if (mark === 'O') {
    return `${cell}, ${t('minigames.tictactoe.markO')}`
  }
  return `${cell}, ${t('minigames.tictactoe.empty')}`
}

function isWinningCell(index) {
  return Boolean(winningLine.value?.includes(index))
}
</script>

<template>
  <div class="ttt">
    <div class="ttt__players" aria-hidden="true">
      <div class="ttt__player" :class="{ 'is-active': yourTurn }">
        <span class="ttt__chip ttt__chip--x">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 7 L17 17" />
            <path d="M17 7 L7 17" />
          </svg>
        </span>
        <span>{{ t('minigames.tictactoe.you') }}</span>
        <span class="ttt__score">{{ scoreYou }}</span>
      </div>
      <div class="ttt__player" :class="{ 'is-active': busy && !outcome.winner }">
        <span class="ttt__chip ttt__chip--o">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="6.2" />
          </svg>
        </span>
        <span>{{ t('minigames.tictactoe.opponent') }}</span>
        <span class="ttt__score">{{ scoreOpp }}</span>
      </div>
    </div>

    <div
      class="ttt__board"
      role="grid"
      :aria-label="t('minigames.tictactoe.board')"
    >
      <button
        v-for="(mark, index) in board"
        :key="index"
        type="button"
        class="ttt__cell"
        :class="{
          'is-win': isWinningCell(index),
          'is-last': lastMove === index,
        }"
        role="gridcell"
        :aria-label="cellLabel(mark, index)"
        :disabled="Boolean(mark) || busy || Boolean(outcome.winner)"
        @click="playCell(index)"
      >
        <svg
          v-if="mark === 'X'"
          class="ttt__mark ttt__mark--x"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6.2 6.2 L17.8 17.8" pathLength="1" />
          <path d="M17.8 6.2 L6.2 17.8" pathLength="1" />
        </svg>
        <svg
          v-else-if="mark === 'O'"
          class="ttt__mark ttt__mark--o"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="6.6" pathLength="1" />
        </svg>
        <svg
          v-else
          class="ttt__ghost"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6.2 6.2 L17.8 17.8" />
          <path d="M17.8 6.2 L6.2 17.8" />
        </svg>
      </button>

      <svg
        v-if="winGeometry"
        class="ttt__win-line"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          :x1="winGeometry.x1"
          :y1="winGeometry.y1"
          :x2="winGeometry.x2"
          :y2="winGeometry.y2"
        />
      </svg>
    </div>

    <p class="ttt__status" aria-live="polite">{{ statusText }}</p>

    <button
      type="button"
      class="ui-btn ui-btn--secondary ttt__again"
      @click="resetBoard"
    >
      {{ t('minigames.again') }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.ttt {
  --ttt-x: var(--maint-accent, #d0322d);
  --ttt-o: color-mix(in srgb, var(--ui-text, #14151a) 72%, var(--ui-info, #3b82f6));
  --ttt-line: color-mix(in srgb, var(--ui-border, rgba(17, 18, 35, 0.16)) 88%, var(--ui-text, #14151a));
  --ttt-tile: color-mix(in srgb, var(--ui-surface, #fff) 88%, var(--ui-surface-2, #f1f3f5));
  text-align: center;
}

.ttt__players {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin: 0 auto 1rem;
  width: min(100%, 17.5rem);
}

.ttt__player {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
  border-radius: 999px;
  transition: background-color 0.22s ease, color 0.22s ease;

  &.is-active {
    color: var(--ui-text, var(--color-primary-text, #14151a));
    background: color-mix(in srgb, var(--ui-surface-2, #f1f3f5) 78%, transparent);
  }
}

.ttt__chip {
  display: inline-flex;
  width: 1.15rem;
  height: 1.15rem;

  svg {
    width: 100%;
    height: 100%;
    stroke-width: 2.15;
    stroke-linecap: round;
  }

  &--x svg { stroke: var(--ttt-x); }
  &--o svg { stroke: var(--ttt-o); }
}

.ttt__score {
  min-width: 1.1em;
  font-variant-numeric: tabular-nums;
}

.ttt__board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(100%, 17.5rem);
  margin: 0 auto;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--ttt-tile);
  border: 1px solid var(--ui-border, rgba(17, 18, 35, 0.14));
  border-radius: 18px;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, #fff 42%, transparent),
    0 10px 28px color-mix(in srgb, var(--ui-text, #14151a) 6%, transparent);
}

.ttt__cell {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 3.25rem;
  padding: 0;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--ttt-line);
  border-bottom: 1px solid var(--ttt-line);
  cursor: pointer;
  touch-action: manipulation;

  &:nth-child(3n) { border-right: 0; }
  &:nth-child(n + 7) { border-bottom: 0; }
  &:disabled { cursor: default; }

  &:not(:disabled):hover,
  &:not(:disabled):focus-visible {
    background: color-mix(in srgb, var(--ttt-x) 7%, transparent);
  }

  &:not(:disabled):hover .ttt__ghost,
  &:not(:disabled):focus-visible .ttt__ghost {
    opacity: 0.28;
  }

  &:not(:disabled):active {
    background: color-mix(in srgb, var(--ttt-x) 12%, transparent);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--ttt-x) 50%, transparent);
    outline-offset: -3px;
    z-index: 1;
  }

  &.is-win {
    background: color-mix(in srgb, var(--ttt-x) 10%, transparent);
  }

  &.is-last:not(.is-win)::after {
    content: '';
    position: absolute;
    inset: 18%;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--ui-text, #14151a) 12%, transparent);
    pointer-events: none;
  }
}

.ttt__mark,
.ttt__ghost {
  width: 46%;
  height: 46%;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}

.ttt__mark--x { stroke: var(--ttt-x); stroke-width: 2.15; }
.ttt__mark--o { stroke: var(--ttt-o); stroke-width: 2; }
.ttt__ghost { stroke: var(--ttt-x); stroke-width: 2.15; opacity: 0; }

.ttt__mark path,
.ttt__mark circle {
  stroke-dasharray: 1;
  animation: ttt-draw 0.34s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.ttt__mark--x path:nth-child(2) { animation-delay: 0.07s; }

.ttt__win-line {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;

  line {
    stroke: var(--ttt-x);
    stroke-width: 2.4;
    stroke-linecap: round;
    opacity: 0.85;
    animation: ttt-line 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

.ttt__status {
  margin: 1rem 0 0;
  min-height: 1.4em;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.ttt__again { margin-top: 0.85rem; }

@keyframes ttt-draw {
  from { stroke-dashoffset: 1; opacity: 0.2; }
  to { stroke-dashoffset: 0; opacity: 1; }
}

@keyframes ttt-line {
  from { stroke-dasharray: 140; stroke-dashoffset: 140; }
  to { stroke-dasharray: 140; stroke-dashoffset: 0; }
}

html[data-ergo-motion='reduce'] {
  .ttt__player,
  .ttt__ghost { transition: none; }

  .ttt__mark path,
  .ttt__mark circle,
  .ttt__win-line line { animation: none; }
}
</style>
