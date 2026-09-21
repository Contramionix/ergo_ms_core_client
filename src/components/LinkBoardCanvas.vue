<template>
  <div ref="boardRef" class="link-board-canvas" @scroll="scheduleDraw">
    <svg
      class="link-board-canvas__svg"
      :width="svgSize.width"
      :height="svgSize.height"
      aria-hidden="true"
    >
      <path
        v-for="path in paths"
        :key="path.key"
        class="link-board-canvas__edge"
        :class="{
          'link-board-canvas__edge--on': path.on,
          'link-board-canvas__edge--dim': path.dim,
        }"
        fill="none"
        stroke-linecap="round"
        :d="path.d"
        :stroke-width="path.width"
        :stroke-opacity="path.opacity"
      />
    </svg>
    <div class="link-board-canvas__left" @scroll="scheduleDraw">
      <article
        v-for="item in leftItems"
        :key="item.id"
        :ref="(el) => setLeftEl(item.id, el)"
        class="link-board-card"
        :class="{
          'link-board-card--weak': isWeak(item.id),
          'link-board-card--dim': isLeftDim(item.id),
          'link-board-card--hl': isLeftHot(item.id),
          'link-board-card--open': isLeftOpen(item.id),
          'link-board-card--compact': item.compact,
        }"
        @pointerenter="onEnter('left', item.id)"
        @pointerleave="onLeave"
        @click="onToggle('left', item.id)"
      >
        <slot name="left-card" :item="item" :count="leftCount(item.id)" :weak="isWeak(item.id)">
          <div class="link-board-card__head">
            <span v-if="item.code" class="link-board-card__code">{{ item.code }}</span>
            <span class="link-board-card__count">{{ countText(item.id, isWeak(item.id)) }}</span>
          </div>
          <p class="link-board-card__title">{{ item.title }}</p>
        </slot>
      </article>
    </div>
    <div class="link-board-canvas__right" @scroll="scheduleDraw">
      <template v-for="group in orderedGroups" :key="group.id">
        <div v-if="group.label" class="link-board-canvas__group">{{ group.label }}</div>
        <button
          v-for="item in group.items"
          :key="item.id"
          :ref="(el) => setRightEl(item.id, el)"
          type="button"
          class="link-board-pill"
          :class="{
            'link-board-pill--orphan': isOrphan(item.id),
            'link-board-pill--dim': isRightDim(item.id),
            'link-board-pill--hl': isRightHot(item.id),
            'link-board-pill--compact': item.compact,
          }"
          @pointerenter="onEnter('right', item.id)"
          @pointerleave="onLeave"
          @click="onToggle('right', item.id)"
        >
          <slot
            name="right-pill"
            :item="item"
            :count="rightCount(item.id)"
            :orphan="isOrphan(item.id)"
          >
            <span class="link-board-pill__label">{{ item.label }}</span>
            <small>{{ rightCountText(item.id) }}</small>
          </slot>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import {
  STROKE_OPACITY,
  STROKE_WIDTH,
  cubicPath,
  formatCount,
  orderRightGroups,
  relativeBox,
} from './linkBoardModel.js'

const props = defineProps({
  leftItems: { type: Array, default: () => [] },
  rightGroups: { type: Array, default: () => [] },
  linkMap: { type: Map, default: () => new Map() },
  leftCounts: { type: Map, default: () => new Map() },
  rightCounts: { type: Map, default: () => new Map() },
  weakIds: { type: Set, default: () => new Set() },
  activeLeftIds: { type: Set, default: null },
  activeRightIds: { type: Set, default: null },
  pinned: { type: Object, default: null },
})

const emit = defineEmits(['enter', 'leave', 'toggle'])

const { t, locale } = useAppI18n()
const boardRef = ref(null)
const svgSize = ref({ width: 0, height: 0 })
const paths = ref([])
const leftEls = new Map()
const rightEls = new Map()
let drawFrame = 0
let resizeObserver = null

const orderedGroups = computed(() => (
  orderRightGroups(props.rightGroups, props.leftItems, props.linkMap)
))

const countForms = computed(() => ({
  one: t('components.linkBoard.countOne'),
  few: t('components.linkBoard.countFew'),
  many: t('components.linkBoard.countMany'),
}))

function leftCount(id) {
  return props.leftCounts.get(String(id)) || 0
}

function rightCount(id) {
  return props.rightCounts.get(String(id)) || 0
}

function isWeak(id) {
  return props.weakIds.has(String(id))
}

function isOrphan(id) {
  return !rightCount(id)
}

function isLeftDim(id) {
  return Boolean(props.activeLeftIds) && !props.activeLeftIds.has(String(id))
}

function isRightDim(id) {
  return Boolean(props.activeRightIds) && !props.activeRightIds.has(String(id))
}

function isLeftHot(id) {
  return Boolean(props.activeLeftIds) && props.activeLeftIds.has(String(id))
}

function isRightHot(id) {
  return Boolean(props.activeRightIds) && props.activeRightIds.has(String(id))
}

function isLeftOpen(id) {
  return props.pinned?.kind === 'left' && String(props.pinned.id) === String(id)
}

function countText(id, weak) {
  const prefix = weak ? `${t('components.linkBoard.weakPrefix')} ` : ''
  return `${prefix}${formatCount(leftCount(id), countForms.value, locale.value)}`
}

function rightCountText(id) {
  const n = rightCount(id)
  return n ? String(n) : t('components.linkBoard.countNone')
}

function setLeftEl(id, el) {
  if (el) {
    leftEls.set(String(id), el)
  } else {
    leftEls.delete(String(id))
  }
}

function setRightEl(id, el) {
  if (el) {
    rightEls.set(String(id), el)
  } else {
    rightEls.delete(String(id))
  }
}

function onEnter(side, id) {
  emit('enter', side, id)
}

function onLeave() {
  emit('leave')
}

function onToggle(side, id) {
  emit('toggle', side, id)
}

function draw() {
  const board = boardRef.value
  if (!board) {
    return
  }
  svgSize.value = {
    width: Math.max(board.clientWidth, board.scrollWidth),
    height: Math.max(board.clientHeight, board.scrollHeight),
  }
  const next = []
  const dimAll = Boolean(props.activeLeftIds || props.activeRightIds)
  for (const link of props.linkMap.values()) {
    const leftEl = leftEls.get(link.from)
    const rightEl = rightEls.get(link.to)
    if (!leftEl || !rightEl) {
      continue
    }
    const leftBox = relativeBox(leftEl, board)
    const rightBox = relativeBox(rightEl, board)
    const ys = rightBox.top + rightBox.height / 2
    const y1 = Math.min(Math.max(ys, leftBox.top + 12), leftBox.bottom - 12)
    const on = dimAll && props.activeLeftIds?.has(link.from) && props.activeRightIds?.has(link.to)
    next.push({
      key: `${link.from}|${link.to}`,
      d: cubicPath(leftBox.right, y1, rightBox.left, ys),
      width: STROKE_WIDTH[link.level],
      opacity: STROKE_OPACITY[link.level],
      on,
      dim: dimAll && !on,
    })
  }
  paths.value = next
}

function scheduleDraw() {
  if (drawFrame) {
    return
  }
  drawFrame = requestAnimationFrame(() => {
    drawFrame = 0
    draw()
  })
}

watch(
  () => [
    props.leftItems,
    props.rightGroups,
    props.linkMap,
    props.activeLeftIds,
    props.activeRightIds,
  ],
  () => {
    nextTick(scheduleDraw)
  },
  { deep: true },
)

onMounted(() => {
  nextTick(draw)
  if (typeof ResizeObserver !== 'undefined' && boardRef.value) {
    resizeObserver = new ResizeObserver(scheduleDraw)
    resizeObserver.observe(boardRef.value)
  }
  window.addEventListener('resize', scheduleDraw)
})

onBeforeUnmount(() => {
  if (drawFrame) {
    cancelAnimationFrame(drawFrame)
  }
  resizeObserver?.disconnect()
  window.removeEventListener('resize', scheduleDraw)
})
</script>

<style scoped lang="scss">
@use '@/scss/ui/mixins' as *;

.link-board-canvas {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.25rem;
  max-height: 70vh;
  overflow: auto;
  @include ui-reduced-motion;
}

.link-board-canvas__svg {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
  overflow: visible;
}

.link-board-canvas__edge {
  stroke: var(--ui-border-strong);
  transition: opacity var(--ui-transition), stroke var(--ui-transition);

  &--on {
    stroke: var(--ui-accent);
  }

  &--dim {
    opacity: 0.08;
  }
}

.link-board-canvas__left,
.link-board-canvas__right {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.link-board-canvas__left {
  flex: 1 1 18rem;
  max-width: 32rem;
}

.link-board-canvas__right {
  flex: 1 1 16rem;
  min-width: 12rem;
}

.link-board-canvas__group {
  margin: 0.35rem 0 0 0.25rem;
  font-size: 0.6875rem;
  color: var(--ui-text-muted);

  &:first-child {
    margin-top: 0;
  }
}

.link-board-card {
  padding: 0.5rem 0.65rem;
  border: 0.5px solid var(--ui-border);
  border-radius: 0.5rem;
  background: var(--ui-surface-2);
  font-size: 0.8125rem;
  line-height: 1.35;
  cursor: pointer;
  transition: opacity var(--ui-transition), border-color var(--ui-transition);

  &--weak .link-board-card__count {
    color: var(--ui-warning);
  }

  &--dim {
    opacity: 0.18;
  }

  &--hl {
    border-color: var(--ui-accent);
    border-width: 1.5px;
  }

  &--open .link-board-card__title {
    color: var(--ui-text);
    -webkit-line-clamp: unset;
  }

  &--compact:not(&--open) .link-board-card__title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.link-board-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.2rem;
}

.link-board-card__code {
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--ui-info-soft);
  color: var(--ui-info);
  font-size: 0.75rem;
  font-weight: 500;
}

.link-board-card__count {
  font-size: 0.6875rem;
  color: var(--ui-text-muted);
}

.link-board-card__title {
  margin: 0;
  color: var(--ui-text-muted);
  overflow-wrap: anywhere;
}

.link-board-pill {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.45rem;
  width: 100%;
  padding: 0.25rem 0.7rem;
  border: 0.5px solid transparent;
  border-radius: 14px;
  background: var(--ui-success-soft);
  color: var(--ui-success);
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
  transition: opacity var(--ui-transition), border-color var(--ui-transition);

  small {
    flex: 0 0 auto;
    font-size: 0.6875rem;
    opacity: 0.8;
  }

  &--orphan {
    background: transparent;
    border: 1px dashed var(--ui-border-strong);
    color: var(--ui-text-muted);
  }

  &--dim {
    opacity: 0.18;
  }

  &--hl {
    border-color: var(--ui-accent);
    border-width: 1.5px;
  }

  &--compact .link-board-pill__label {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.link-board-pill__label {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 700px) {
  .link-board-canvas {
    flex-direction: column;
    max-height: none;
  }

  .link-board-canvas__left,
  .link-board-canvas__right {
    max-width: none;
    width: 100%;
    flex: 1 1 auto;
  }

  .link-board-canvas__svg {
    display: none;
  }
}
</style>
