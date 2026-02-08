<script setup>
import { computed } from 'vue'
import { getIndicatorValue } from './js/chartDataTransform.js'

const props = defineProps({
  fields: { type: Object, default: () => ({}) },
  settings: { type: Array, default: () => [] },
  dataset: { type: Array, default: () => [] }
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

const value = computed(() => {
  const field = valueField.value
  if (!field || !props.dataset?.length) return null
  return getIndicatorValue(props.dataset, field, aggregation.value, [])
})

const displayText = computed(() => {
  const v = value.value
  if (v == null) return '—'
  const num = Number(v)
  const formatted = Number.isFinite(num) ? (Number.isInteger(num) ? num : num.toFixed(2)) : String(v)
  return unit.value ? `${formatted} ${unit.value}` : formatted
})
</script>

<template>
  <div class="chart-indicator">
    <div class="chart-indicator-value">{{ displayText }}</div>
    <div v-if="valueField?.label" class="chart-indicator-label">{{ valueField.label }}</div>
  </div>
</template>

<style scoped>
.chart-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 1rem;
  text-align: center;
}
.chart-indicator-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-primary-text, #212529);
}
.chart-indicator-label {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-secondary-text, #6c757d);
}
</style>
