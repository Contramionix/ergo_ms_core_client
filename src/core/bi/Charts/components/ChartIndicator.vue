<script setup>
import { computed } from 'vue'
import { getIndicatorValue } from './js/chartDataTransform.js'
import { normalizedFilters } from './js/echartsOptionBuilder.js'

const props = defineProps({
  fields: { type: Object, default: () => ({}) },
  settings: { type: Array, default: () => [] },
  dataset: { type: Array, default: () => [] },
  displayOptions: { type: Object, default: () => ({}) },
})

const valueField = computed(() => {
  const v = props.fields?.value
  const ind = props.fields?.indicators
  if (Array.isArray(v) && v.length) return v[0]
  if (Array.isArray(ind) && ind.length) return ind[0]
  return v?.[0] ?? ind?.[0] ?? null
})

const aggregation = computed(() => props.fields?.aggregation || 'sum')
const unit = computed(() => props.fields?.unit ?? props.fields?.suffix ?? '')

const filters = computed(() => normalizedFilters(props.fields))

const value = computed(() => {
  const field = valueField.value
  if (!field || !props.dataset?.length) return null
  return getIndicatorValue(props.dataset, field, aggregation.value, filters.value || [])
})

const displayText = computed(() => {
  const v = value.value
  if (v == null) return '—'
  const num = Number(v)
  const formatted = Number.isFinite(num) ? (Number.isInteger(num) ? num : num.toFixed(2)) : String(v)
  return unit.value ? `${formatted} ${unit.value}` : formatted
})

const titleMode = computed(() => (props.displayOptions?.titleMode || 'fieldName').toLowerCase())
const titleText = computed(() => props.displayOptions?.titleText ?? '')
const showLabel = computed(() => {
  if (titleMode.value === 'hide') return false
  if (titleMode.value === 'manual') return !!titleText.value
  return !!valueField.value?.label
})
const labelText = computed(() => {
  if (titleMode.value === 'manual') return titleText.value
  return valueField.value?.label ?? ''
})

const sizeClass = computed(() => {
  const s = (props.displayOptions?.indicatorSize || 's').toLowerCase()
  const valid = ['xs', 's', 'm', 'l']
  return valid.includes(s) ? `chart-indicator--size-${s}` : 'chart-indicator--size-s'
})
</script>

<template>
  <div class="chart-indicator" :class="sizeClass">
    <div class="chart-indicator-value">{{ displayText }}</div>
    <div v-if="showLabel" class="chart-indicator-label">{{ labelText }}</div>
  </div>
</template>

<style scoped>
.chart-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  flex: 1;
  padding: 1rem;
  text-align: center;
}
.chart-indicator-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-primary-text, #212529);
}

.chart-indicator--size-xs .chart-indicator-value { font-size: 1.5rem; }
.chart-indicator--size-s .chart-indicator-value { font-size: 2rem; }
.chart-indicator--size-m .chart-indicator-value { font-size: 2.5rem; }
.chart-indicator--size-l .chart-indicator-value { font-size: 3.25rem; }

.chart-indicator-label {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-secondary-text, #6c757d);
}

.chart-indicator--size-xs .chart-indicator-label { font-size: 0.75rem; }
.chart-indicator--size-s .chart-indicator-label { font-size: 0.8rem; }
.chart-indicator--size-m .chart-indicator-label { font-size: 0.9rem; }
.chart-indicator--size-l .chart-indicator-label { font-size: 1.1rem; }
</style>
