<script setup>
import { computed, defineAsyncComponent } from 'vue'
import EChartsComponent from '../EChartsComponent.vue'

const props = defineProps({
  type: { type: [String, Number], default: '' },
  fields: Object,
  settings: Array,
  dataset: { type: [Array, Object], default: () => [] }
})

const chartTypeMap = { 1: 'line', 2: 'bar', 3: 'pie', 4: 'doughnut', 5: 'scatter', 6: 'radar', 7: 'heatmap' }

const chartKind = computed(() => {
  if (!props.type) return 'bar'
  if (typeof props.type === 'string') return props.type
  return chartTypeMap[props.type] || 'bar'
})

const datasetArray = computed(() => (Array.isArray(props.dataset) ? props.dataset : []))
</script>

<template>
  <div class="area d-flex flex-column h-100 w-100">
    <div class="chart d-flex h-100 w-100 justify-content-center align-items-center">
      <EChartsComponent
        :type="chartKind"
        :fields="fields"
        :settings="settings"
        :dataset="datasetArray"
      />
    </div>
  </div>
</template>
