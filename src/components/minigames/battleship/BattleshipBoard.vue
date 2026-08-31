<script setup>
import { computed } from 'vue'
import { BATTLESHIP_COLS, BATTLESHIP_SIZE } from './battleshipLogic.js'

const props = defineProps({
  board: { type: Object, required: true },
  label: { type: String, required: true },
  showShips: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false },
  lastShot: { type: Number, default: -1 },
  previewCells: { type: Array, default: () => [] },
  previewValid: { type: Boolean, default: false },
  cellName: { type: Function, required: true },
})

const emit = defineEmits(['cell-click', 'cell-pointerdown', 'cell-enter', 'cell-leave'])

const axis = computed(() => Array.from({ length: BATTLESHIP_SIZE }, (_, index) => index))

function idx(row, col) {
  return row * BATTLESHIP_SIZE + col
}

function letter(col) {
  return BATTLESHIP_COLS[col]
}

function shipOf(cell) {
  return cell.shipId === null ? null : props.board.ships[cell.shipId]
}

function showHull(cell) {
  const ship = shipOf(cell)
  return Boolean(ship?.placed && (props.showShips || ship.sunk))
}

function cellDisabled(cell) {
  if (!props.interactive) {
    return true
  }
  return props.showShips ? false : cell.shot
}
</script>

<template>
  <div
    class="sea-board"
    role="grid"
    :aria-label="label"
    :style="{ '--sea-size': BATTLESHIP_SIZE }"
  >
    <span class="sea-board__corner" aria-hidden="true" />
    <span
      v-for="col in axis"
      :key="`c-${col}`"
      class="sea-board__axis sea-board__axis--col"
      aria-hidden="true"
    >{{ letter(col) }}</span>

    <template v-for="row in axis" :key="`r-${row}`">
      <span class="sea-board__axis sea-board__axis--row" aria-hidden="true">{{ row + 1 }}</span>
      <button
        v-for="col in axis"
        :key="`${row}-${col}`"
        type="button"
        class="sea-board__cell"
        :class="{
          'is-ship': showHull(board.cells[idx(row, col)]),
          'is-shot': board.cells[idx(row, col)].shot,
          'is-hit': board.cells[idx(row, col)].hit,
          'is-sunk': showHull(board.cells[idx(row, col)]) && shipOf(board.cells[idx(row, col)])?.sunk,
          'is-last': lastShot === idx(row, col),
          'is-preview': previewCells.includes(idx(row, col)),
          'is-preview-ok': previewCells.includes(idx(row, col)) && previewValid,
          'is-preview-bad': previewCells.includes(idx(row, col)) && !previewValid,
        }"
        role="gridcell"
        :data-sea-cell="idx(row, col)"
        :aria-label="cellName(board.cells[idx(row, col)])"
        :disabled="cellDisabled(board.cells[idx(row, col)])"
        @click="emit('cell-click', idx(row, col))"
        @pointerdown="emit('cell-pointerdown', idx(row, col), $event)"
        @pointerenter="emit('cell-enter', idx(row, col), $event)"
        @pointerleave="emit('cell-leave', idx(row, col), $event)"
      >
        <span
          v-if="board.cells[idx(row, col)].hit"
          class="sea-board__mark sea-board__mark--hit"
          aria-hidden="true"
        />
        <span
          v-else-if="board.cells[idx(row, col)].shot"
          class="sea-board__mark sea-board__mark--miss"
          aria-hidden="true"
        />
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.sea-board {
  --sea-water: color-mix(in srgb, var(--ui-surface, #fff) 82%, #7aa7c7);
  --sea-line: color-mix(in srgb, var(--ui-border, rgba(17, 18, 35, 0.16)) 80%, #4d6f86);
  --sea-hit: var(--maint-accent, #d0322d);
  --sea-miss: color-mix(in srgb, var(--ui-text, #14151a) 38%, transparent);
  --sea-ship: color-mix(in srgb, var(--ui-text, #14151a) 42%, #6f8ea8);
  display: grid;
  grid-template-columns: 1.15rem repeat(var(--sea-size), minmax(0, 1fr));
  width: min(100%, 21rem);
  margin: 0 auto;
  user-select: none;
}

.sea-board__corner {
  width: 1.15rem;
  height: 1.05rem;
}

.sea-board__axis {
  display: grid;
  place-items: center;
  font-size: 0.62rem;
  line-height: 1;
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
}

.sea-board__axis--col { height: 1.05rem; }
.sea-board__axis--row { width: 1.15rem; }

.sea-board__cell {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  min-width: 0;
  min-height: 1.55rem;
  padding: 0;
  background: var(--sea-water);
  border: 0;
  box-shadow: inset -1px -1px 0 var(--sea-line);
  cursor: pointer;
  touch-action: none;

  &:disabled { cursor: default; }

  &:not(:disabled):hover,
  &:not(:disabled):focus-visible {
    background: color-mix(in srgb, #fff 22%, var(--sea-water));
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--sea-hit) 50%, transparent);
    outline-offset: -2px;
    z-index: 1;
  }

  &.is-ship {
    background: color-mix(in srgb, var(--sea-ship) 55%, var(--sea-water));
  }

  &.is-hit {
    background: color-mix(in srgb, var(--sea-hit) 18%, var(--sea-water));
  }

  &.is-sunk {
    background: color-mix(in srgb, var(--sea-hit) 30%, var(--sea-ship));
  }

  &.is-preview-ok {
    background: color-mix(in srgb, #3b82f6 28%, var(--sea-water));
  }

  &.is-preview-bad {
    background: color-mix(in srgb, var(--sea-hit) 28%, var(--sea-water));
  }

  &.is-last::after {
    content: '';
    position: absolute;
    inset: 14%;
    border: 1.5px solid color-mix(in srgb, var(--ui-text, #14151a) 45%, transparent);
    border-radius: 50%;
    pointer-events: none;
  }
}

.sea-board__mark {
  display: block;
  border-radius: 50%;
  pointer-events: none;
}

.sea-board__mark--miss {
  width: 22%;
  height: 22%;
  background: var(--sea-miss);
}

.sea-board__mark--hit {
  width: 34%;
  height: 34%;
  background: var(--sea-hit);
}
</style>
