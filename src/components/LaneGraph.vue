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
              [`lane-graph__edge--tone-${edge.tone}`]: Boolean(edge.tone) && !edge.bad,
              'lane-graph__edge--dashed': edge.dashed && !edge.bad,
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
  // Все карточки одной высоты; длинный заголовок обрезается, полный — в подсказке.
  uniformCards: { type: Boolean, default: false },
  // full — вся цепочка зависимостей при наведении; direct — только соседи карточки.
  focusChain: { type: String, default: 'full' },
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
  uniform: props.uniformCards,
}))
const directFocus = computed(() => props.focusChain === 'direct')

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
  if (directFocus.value) {
    ;(layout.value.parents.get(id) || []).forEach((value) => ids.add(value))
    ;(layout.value.children.get(id) || []).forEach((value) => ids.add(value))
    return ids
  }
  collectUpstream(id, layout.value.parents).forEach((value) => ids.add(value))
  collectDownstream(id, layout.value.children).forEach((value) => ids.add(value))
  return ids
})

const activeEdges = computed(() => {
  const id = focusedId.value
  if (!id) return new Set()
  if (directFocus.value) {
    return new Set(layout.value.edges.filter((edge) => edge.from === id || edge.to === id).map((edge) => edge.id))
  }
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
    'lane-graph__card--filled': item.filled,
    'lane-graph__card--uniform': props.uniformCards,
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

<style scoped lang="scss" src="./LaneGraph.scss"></style>
