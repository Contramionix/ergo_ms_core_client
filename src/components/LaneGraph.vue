<template>
  <div class="lane-graph" :class="{ 'lane-graph--static': reducedMotion }">
    <div v-if="modesVisible" class="lane-graph__toolbar" role="group" :aria-label="t('components.laneGraph.modesLabel')">
      <button
        v-for="option in modeOptions"
        :key="option.id"
        type="button"
        class="lane-graph__mode"
        :class="{ 'lane-graph__mode--on': mode === option.id }"
        :aria-pressed="mode === option.id"
        @click="setMode(option.id)"
      >
        {{ option.label }}
      </button>
    </div>

    <p v-if="!layout.items.length" class="lane-graph__empty">
      {{ emptyText || t('components.laneGraph.empty') }}
    </p>

    <div v-else class="lane-graph__scroll">
      <div
        class="lane-graph__canvas"
        :class="{ 'lane-graph__canvas--badges': mode === 'blocking' }"
        v-csp-style="canvasStyle"
      >
        <svg
          v-if="showEdges && layout.edges.length"
          class="lane-graph__svg"
          :width="layout.size.width"
          :height="layout.size.height"
          aria-hidden="true"
        >
          <defs>
            <marker
              :id="markerId"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              markerUnits="userSpaceOnUse"
              orient="auto-start-reverse"
            >
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </marker>
          </defs>
          <path
            v-for="edge in layout.edges"
            :key="edge.id"
            :d="edge.d"
            class="lane-graph__edge"
            :class="{
              'lane-graph__edge--on': activeEdges.has(edge.id),
              'lane-graph__edge--dim': isEdgeDim(edge),
              'lane-graph__edge--crit': isEdgeCrit(edge),
              'lane-graph__edge--bad': edge.bad,
            }"
            :marker-end="edge.bad ? null : `url(#${markerId})`"
          />
        </svg>

        <div
          v-for="lane in layout.lanes"
          :key="`lane-${lane.id}`"
          class="lane-graph__lane"
          :class="{ 'lane-graph__lane--over': lane.over }"
          v-csp-style="lane.style"
        >
          <div class="lane-graph__lane-head">
            <b>{{ laneTitle(lane) }}</b>
            <span class="lane-graph__lane-weight">{{ laneWeightText(lane) }}</span>
          </div>
          <div class="lane-graph__bar" :class="{ 'lane-graph__bar--over': lane.over }">
            <i v-csp-style="{ width: `${lane.ratio}%` }" />
          </div>
        </div>

        <button
          v-for="item in layout.items"
          :key="item.id"
          type="button"
          class="lane-graph__card"
          :class="cardClass(item)"
          v-csp-style="item.style"
          :aria-pressed="pinnedId === item.id"
          :title="item.title"
          :aria-label="item.title"
          @pointerenter="onHover(item.id)"
          @pointerleave="onLeave"
          @focus="onHover(item.id)"
          @blur="onLeave"
          @click="onSelect(item.id)"
        >
          <span class="lane-graph__card-inner">
            <slot name="item" :item="item">
              <span class="lane-graph__card-title">{{ item.title }}</span>
              <span class="lane-graph__card-meta">
                <span v-if="item.weight">{{ formatWeight(item.weight) }}{{ weightSuffix }}</span>
                <span v-if="item.badge">{{ item.badge }}</span>
              </span>
            </slot>
          </span>
          <span v-if="mode === 'blocking'" class="lane-graph__badge">
            {{ layout.metrics.byId[item.id]?.blocking || 0 }}
          </span>
        </button>
      </div>
    </div>

    <div v-if="resolvedCategories.length && layout.items.length" class="lane-graph__legend">
      <slot name="legend" :categories="resolvedCategories">
        <span v-for="category in resolvedCategories" :key="category.id" class="lane-graph__legend-item">
          <i class="lane-graph__swatch" :class="`lane-graph__swatch--${category.tone}`" />
          {{ category.label }}
        </span>
        <span class="lane-graph__legend-item">
          <i class="lane-graph__swatch lane-graph__swatch--optional" />
          {{ t('components.laneGraph.optional') }}
        </span>
      </slot>
    </div>

    <p v-if="showWarnings && warningText" class="lane-graph__warn">{{ warningText }}</p>
    <div v-if="showDetail" class="lane-graph__info">
      <slot
        name="detail"
        :item="focusedItem"
        :metrics="focusedMetrics"
        :mode="mode"
      >
        <p v-if="infoHtml" class="lane-graph__info-text">{{ infoText }}</p>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { getI18n } from '@/i18n/index.js'
import { useAppI18n } from '@/i18n/useAppI18n.js'
import { useUiModes } from '@/composables/useUiModes.js'
import enComponents from '@/i18n/locales/en/components.js'
import frComponents from '@/i18n/locales/fr/components.js'
import ruComponents from '@/i18n/locales/ru/components.js'
import {
  collectDownstream,
  collectUpstream,
  deriveLaneGraphCategories,
  hashTone,
  isCriticalEdge,
  layoutLaneGraph,
} from '@/js/utils/laneGraphLayout.js'

const LANE_GRAPH_MESSAGES = {
  ru: ruComponents.laneGraph,
  en: enComponents.laneGraph,
  fr: frComponents.laneGraph,
}

function ensureLaneGraphI18n() {
  const globalI18n = getI18n()?.global
  if (!globalI18n?.mergeLocaleMessage) {
    return
  }
  for (const [locale, laneGraph] of Object.entries(LANE_GRAPH_MESSAGES)) {
    globalI18n.mergeLocaleMessage(locale, { components: { laneGraph } })
  }
}

ensureLaneGraphI18n()

const props = defineProps({
  items: { type: Array, default: () => [] },
  lanes: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
  weightUnit: { type: String, default: '' },
  emptyText: { type: String, default: '' },
  defaultMode: { type: String, default: 'overview' },
  showModes: { type: Boolean, default: true },
  showEdges: { type: Boolean, default: true },
  showDetail: { type: Boolean, default: true },
  showWarnings: { type: Boolean, default: true },
})

const emit = defineEmits(['hover', 'select'])

const { t } = useAppI18n({ useScope: 'global' })
const { reducedMotionActive } = useUiModes()
const reducedMotion = computed(() => Boolean(reducedMotionActive.value))
const mode = ref(['overview', 'critical', 'blocking'].includes(props.defaultMode) ? props.defaultMode : 'overview')
const pinnedId = ref(null)
const hoveredId = ref(null)
const markerId = `lane-graph-arrow-${Math.random().toString(36).slice(2, 9)}`

const layout = computed(() => layoutLaneGraph({
  items: props.items,
  lanes: props.lanes,
}))

const resolvedCategories = computed(() => deriveLaneGraphCategories(layout.value.items, props.categories))
const categoryTone = computed(() => {
  const map = new Map(resolvedCategories.value.map((row) => [row.id, row.tone]))
  return map
})

const modesVisible = computed(() => props.showModes && layout.value.hasEdges)
const modeOptions = computed(() => [
  { id: 'overview', label: t('components.laneGraph.modeOverview') },
  { id: 'critical', label: t('components.laneGraph.modeCritical') },
  { id: 'blocking', label: t('components.laneGraph.modeBlocking') },
])

const focusedId = computed(() => pinnedId.value || hoveredId.value)
const focusedItem = computed(() => (
  focusedId.value ? layout.value.byId.get(focusedId.value) || null : null
))
const focusedMetrics = computed(() => (
  focusedId.value ? layout.value.metrics.byId[focusedId.value] || null : null
))

const chainIds = computed(() => {
  const id = focusedId.value
  if (!id) return new Set()
  const ids = new Set([id])
  collectUpstream(id, layout.value.parents).forEach((value) => ids.add(value))
  collectDownstream(id, layout.value.children).forEach((value) => ids.add(value))
  return ids
})

const activeEdges = computed(() => {
  const id = focusedId.value
  if (!id) return new Set()
  const up = collectUpstream(id, layout.value.parents)
  const down = collectDownstream(id, layout.value.children)
  const on = new Set()
  for (const edge of layout.value.edges) {
    const inUp = (up.has(edge.from) || edge.from === id) && (up.has(edge.to) || edge.to === id)
    const inDown = (down.has(edge.from) || edge.from === id) && (down.has(edge.to) || edge.to === id)
    if (inUp || inDown) on.add(edge.id)
  }
  return on
})

const canvasStyle = computed(() => ({
  width: `${layout.value.size.width}px`,
  height: `${layout.value.size.height}px`,
}))

const weightSuffix = computed(() => {
  const unit = String(props.weightUnit || '').trim()
  return unit ? ` ${unit}` : ''
})

const warningText = computed(() => {
  const lines = []
  const byId = layout.value.byId
  for (const edge of layout.value.edges) {
    if (!edge.bad) continue
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (!from || !to) continue
    lines.push(t('components.laneGraph.invalidEdge', {
      from: to.title,
      to: from.title,
      fromLane: laneTitle(layout.value.lanes[to.lane] || { id: to.lane }),
      toLane: laneTitle(layout.value.lanes[from.lane] || { id: from.lane }),
    }))
  }
  for (const lane of layout.value.lanes) {
    if (!lane.over) continue
    lines.push(t('components.laneGraph.overload', {
      lane: laneTitle(lane),
      sum: formatWeight(lane.weight),
      limit: formatWeight(lane.weightLimit),
    }))
  }
  return lines.join(' ')
})

const infoText = computed(() => {
  const item = focusedItem.value
  const metrics = focusedMetrics.value
  if (item && metrics) {
    const requires = item.dependsOn.map((id) => layout.value.byId.get(id)?.title).filter(Boolean)
    const opens = (layout.value.children.get(item.id) || [])
      .map((id) => layout.value.byId.get(id)?.title)
      .filter(Boolean)
    const parts = [
      t('components.laneGraph.detailTitle', {
        title: item.title,
        lane: laneTitle(layout.value.lanes[item.lane] || { id: item.lane }),
        weight: item.weight ? `${formatWeight(item.weight)}${weightSuffix.value}` : t('components.laneGraph.none'),
      }),
      t('components.laneGraph.detailLinks', {
        requires: requires.join(', ') || t('components.laneGraph.none'),
        opens: opens.join(', ') || t('components.laneGraph.none'),
      }),
      t('components.laneGraph.detailChain', {
        blocking: metrics.blocking,
        chain: metrics.chain,
      }),
    ]
    if (metrics.critical) parts.push(t('components.laneGraph.onCriticalPath'))
    if (item.optional) parts.push(t('components.laneGraph.optional'))
    return parts.join(' ')
  }
  if (mode.value === 'critical' && layout.value.hasEdges) {
    return t('components.laneGraph.hintCritical', { n: layout.value.metrics.maxChain })
  }
  if (mode.value === 'blocking') return t('components.laneGraph.hintBlocking')
  return t('components.laneGraph.hintOverview')
})

const infoHtml = computed(() => Boolean(infoText.value))

watch(() => props.showModes, (enabled) => {
  if (!enabled) mode.value = 'overview'
}, { immediate: true })

watch(() => (props.items || []).map((item) => item?.id).join('|'), () => {
  pinnedId.value = null
  hoveredId.value = null
})

function setMode(next) {
  mode.value = next
  pinnedId.value = null
  hoveredId.value = null
}

function onHover(id) {
  if (pinnedId.value) return
  hoveredId.value = id
  emit('hover', id)
}

function onLeave() {
  if (pinnedId.value) return
  hoveredId.value = null
  emit('hover', null)
}

function onSelect(id) {
  pinnedId.value = pinnedId.value === id ? null : id
  hoveredId.value = pinnedId.value
  emit('select', pinnedId.value)
}

function formatWeight(value) {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return '0'
  return Number.isInteger(raw) ? String(raw) : raw.toFixed(1)
}

function laneTitle(lane) {
  return lane?.title || t('components.laneGraph.laneTitle', { n: (lane?.id || 0) + 1 })
}

function laneWeightText(lane) {
  const sum = `${formatWeight(lane.weight)}${weightSuffix.value}`
  if (lane.weightLimit) {
    return t('components.laneGraph.weightOfLimit', {
      sum,
      limit: `${formatWeight(lane.weightLimit)}${weightSuffix.value}`,
    })
  }
  return sum
}

function cardTone(item) {
  if (item.category && categoryTone.value.has(item.category)) {
    return categoryTone.value.get(item.category)
  }
  return hashTone(item.category || item.id)
}

function cardClass(item) {
  const dimAll = Boolean(focusedId.value)
  const onChain = chainIds.value.has(item.id)
  const critDim = mode.value === 'critical' && !focusedId.value && !layout.value.metrics.byId[item.id]?.critical
  return {
    [`lane-graph__card--${cardTone(item)}`]: true,
    'lane-graph__card--optional': item.optional,
    'lane-graph__card--flag': item.highlight,
    'lane-graph__card--sel': pinnedId.value === item.id,
    'lane-graph__card--dim': dimAll ? !onChain : critDim,
  }
}

function isEdgeDim(edge) {
  if (edge.bad) return false
  if (focusedId.value) return !activeEdges.value.has(edge.id)
  return mode.value === 'critical' && !isCriticalEdge(edge, layout.value.metrics)
}

function isEdgeCrit(edge) {
  if (focusedId.value) return false
  return mode.value === 'critical' && isCriticalEdge(edge, layout.value.metrics)
}
</script>

<style scoped lang="scss">
.lane-graph {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.lane-graph__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.lane-graph__mode {
  padding: 0.28rem 0.7rem;
  border: 1px solid var(--ui-border, var(--color-border));
  border-radius: var(--ui-radius, 0.625rem);
  background: var(--ui-surface-2, var(--color-secondary-background));
  color: var(--ui-text-muted, var(--color-secondary-text));
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.lane-graph__mode--on {
  background: var(--ui-accent-soft, color-mix(in srgb, var(--ui-accent) 12%, var(--ui-surface)));
  border-color: color-mix(in srgb, var(--ui-accent) 45%, var(--ui-border));
  color: var(--ui-accent-text, var(--ui-text));
}

.lane-graph__empty,
.lane-graph__info-text,
.lane-graph__warn {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.lane-graph__empty,
.lane-graph__info-text {
  color: var(--ui-text-muted, var(--color-secondary-text));
}

.lane-graph__warn {
  color: var(--ui-danger);
}

.lane-graph__scroll {
  overflow-x: auto;
  max-width: 100%;
}

.lane-graph__canvas {
  position: relative;
  user-select: none;
}

.lane-graph__svg {
  position: absolute;
  left: 0;
  top: 0;
  overflow: visible;
  pointer-events: none;
}

.lane-graph__edge {
  fill: none;
  stroke: var(--ui-border-strong, var(--ui-border));
  stroke-width: 1.2;
  transition: opacity 0.15s, stroke-width 0.15s;
}

.lane-graph__edge--on {
  stroke: var(--ui-accent);
  stroke-width: 2;
}

.lane-graph__edge--dim {
  opacity: 0.1;
}

.lane-graph__edge--crit {
  stroke: var(--ui-warning);
  stroke-width: 2.2;
}

.lane-graph__edge--bad {
  stroke: var(--ui-danger);
  stroke-dasharray: 4 3;
  stroke-width: 1.6;
}

.lane-graph__lane {
  position: absolute;
  top: 0;
  font-size: 0.75rem;
  color: var(--ui-text-muted, var(--color-secondary-text));
}

.lane-graph__lane-head {
  display: flex;
  justify-content: space-between;
  gap: 0.35rem;
  align-items: baseline;
}

.lane-graph__lane-head b {
  font-weight: 600;
  color: var(--ui-text, var(--color-primary-text));
}

.lane-graph__lane--over .lane-graph__lane-weight {
  color: var(--ui-danger);
}

.lane-graph__bar {
  height: 4px;
  margin-top: 5px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--ui-border, var(--color-border));
}

.lane-graph__bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--ui-accent);
}

.lane-graph__bar--over i {
  background: var(--ui-danger);
}

.lane-graph__card {
  position: absolute;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: opacity 0.15s;
}

.lane-graph__card-inner {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.35rem;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--ui-border, var(--color-border));
  border-left-width: 3px;
  border-radius: var(--ui-radius, 0.625rem);
  background: var(--ui-surface, var(--color-primary-background));
  color: var(--ui-text, var(--color-primary-text));
}

.lane-graph__card-title {
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 0.8125rem;
  line-height: 1.3;
  font-weight: 500;
}

.lane-graph__card-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--ui-text-muted, var(--color-secondary-text));
}

.lane-graph__card--accent .lane-graph__card-inner {
  border-left-color: var(--ui-accent);
}

.lane-graph__card--info .lane-graph__card-inner {
  border-left-color: var(--ui-info);
}

.lane-graph__card--success .lane-graph__card-inner {
  border-left-color: var(--ui-success);
}

.lane-graph__card--warning .lane-graph__card-inner {
  border-left-color: var(--ui-warning);
}

.lane-graph__card--neutral .lane-graph__card-inner {
  border-left-color: var(--ui-border-strong, var(--ui-border));
}

.lane-graph__card--optional .lane-graph__card-inner {
  border-style: dashed;
}

.lane-graph__card--sel .lane-graph__card-inner {
  border-width: 2px;
  border-color: var(--ui-accent);
}

.lane-graph__card--flag .lane-graph__card-inner {
  border-color: var(--ui-danger);
}

.lane-graph__card--dim {
  opacity: 0.22;
}

.lane-graph__badge {
  position: absolute;
  top: -8px;
  right: -8px;
  display: none;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--ui-accent) 45%, var(--ui-border));
  border-radius: 10px;
  background: var(--ui-accent-soft);
  color: var(--ui-accent-text, var(--ui-text));
  font-size: 0.68rem;
  font-weight: 600;
}

.lane-graph__canvas--badges .lane-graph__badge {
  display: flex;
}

.lane-graph__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
  font-size: 0.75rem;
  color: var(--ui-text-muted, var(--color-secondary-text));
}

.lane-graph__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.lane-graph__swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  background: var(--ui-neutral-soft);
}

.lane-graph__swatch--accent { background: var(--ui-accent); }
.lane-graph__swatch--info { background: var(--ui-info); }
.lane-graph__swatch--success { background: var(--ui-success); }
.lane-graph__swatch--warning { background: var(--ui-warning); }
.lane-graph__swatch--neutral { background: var(--ui-border-strong, var(--ui-border)); }
.lane-graph__swatch--optional {
  background: transparent;
  border: 1px dashed var(--ui-text-muted);
}

.lane-graph--static .lane-graph__card,
.lane-graph--static .lane-graph__edge {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .lane-graph__card,
  .lane-graph__edge {
    transition: none;
  }
}
</style>
